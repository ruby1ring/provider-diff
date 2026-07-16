#!/usr/bin/env node
/**
 * Apply doc_gap / undocumented_rejected findings into docs/api/*.md
 * Reads outputs/doc-gap-audit.json (from npm run scan:doc-gaps)
 *
 * Usage: npm run apply:doc-gap-backfill
 *        node scripts/apply-doc-gap-backfill.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, stringifyFrontmatter } from "./lib/md-parse.mjs";
import { docPathForChannel, resolveChannelId } from "./lib/channel-doc-map.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUDIT_PATH = path.join(ROOT, "outputs/doc-gap-audit.json");
const MANIFEST_PATH = path.join(ROOT, "scripts/protocol-doc-manifest.mjs");
const TODAY = new Date().toISOString().slice(0, 10);

function loadAudit() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error(`Missing ${path.relative(ROOT, AUDIT_PATH)} — run: npm run scan:doc-gaps`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
}

function observedNote(issue) {
  const params = (issue.parameters || []).join(", ") || "—";
  const caseRef = issue.case_id ? `case: ${issue.case_id}` : "";
  const source = issue.source_file ? `report: ${issue.source_file}` : "";
  const tail = [caseRef, source].filter(Boolean).join("；");
  if (issue.flag === "doc_gap") {
    return `来源：实测（Noctua，${TODAY}）；文档未声明但传参后静默生效。参数：${params}${tail ? `；${tail}` : ""}`;
  }
  return `来源：实测（Noctua，${TODAY}）；文档未声明但传参报错。参数：${params}${tail ? `；${tail}` : ""}`;
}

function appendRowsToDoc(relPath, issues, { dryRun }) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    console.warn(`[skip] missing doc: ${relPath}`);
    return 0;
  }

  const raw = fs.readFileSync(abs, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const marker = "## 实测补充参数（来源：实测）";
  const header = "| Parameter | Type | Required | Default | Range | Notes |";
  const sep = "|---|---|---|---|---|---|";

  const existingParams = new Set();
  for (const match of body.matchAll(/`\s*([a-zA-Z0-9_.[\]]+)\s*`/g)) {
    existingParams.add(match[1]);
  }

  const rows = [];
  for (const issue of issues) {
    for (const parameter of issue.parameters || ["unknown_param"]) {
      if (existingParams.has(parameter)) continue;
      const note = observedNote(issue).replace(/\|/g, "\\|");
      rows.push(`| \`${parameter}\` | \`—\` | no | — | — | ${note} |`);
      existingParams.add(parameter);
    }
  }
  if (!rows.length) return 0;

  const block = `${marker}\n\n${header}\n${sep}\n${rows.join("\n")}\n`;
  let newBody;
  if (body.includes(marker)) {
    newBody = body.trimEnd() + "\n" + rows.join("\n") + "\n";
  } else {
    newBody = `${body.trimEnd()}\n\n${block}`;
  }

  const groups = { ...(meta.parameter_groups || {}) };
  if (!groups.Observed) groups.Observed = [];
  for (const issue of issues) {
    for (const parameter of issue.parameters || []) {
      if (parameter && !groups.Observed.includes(parameter)) groups.Observed.push(parameter);
    }
  }

  const newMeta = {
    ...meta,
    parameter_groups: groups,
    last_verified: TODAY,
    notes: `${meta.notes || ""} ${TODAY} 实测回写 doc_gap ${issues.length} 项。`.trim()
  };

  if (dryRun) {
    console.log(`[dry-run] would update ${relPath} (+${rows.length} rows)`);
    return rows.length;
  }

  fs.writeFileSync(abs, `${stringifyFrontmatter(newMeta)}${newBody}`.trimEnd() + "\n");
  return rows.length;
}

function patchManifest(relPath, parameters) {
  if (!parameters.length || !fs.existsSync(MANIFEST_PATH)) return;
  let source = fs.readFileSync(MANIFEST_PATH, "utf8");
  const entryKey = `"${relPath}"`;
  if (!source.includes(entryKey)) return;

  for (const param of parameters) {
    if (source.includes(`Observed: [${param}]`) || source.includes(`Observed: [${param},`)) continue;
    const re = new RegExp(`("${relPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?parameter_groups:\\s*\\{)`);
    if (!source.match(re)) continue;
    if (/Observed:\s*\[/.test(source.slice(source.indexOf(entryKey), source.indexOf(entryKey) + 1200))) {
      source = source.replace(
        new RegExp(`("${relPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?Observed:\\s*\\[)([^\\]]*)\\]`),
        (full, prefix, list) => {
          const items = list.split(",").map((s) => s.trim()).filter(Boolean);
          if (items.includes(param)) return full;
          return `${prefix}${[...items, param].join(", ")}]`;
        }
      );
    } else {
      source = source.replace(
        re,
        `$1\n      Observed: [${param}],`
      );
    }
  }
  fs.writeFileSync(MANIFEST_PATH, source);
}

function groupIssuesByDoc(issues) {
  const map = new Map();
  for (const issue of issues) {
    const channelId = issue.channel_id || resolveChannelId(issue.channel_name);
    const relPath = docPathForChannel(channelId, issue.protocol_id || "chat_completions");
    if (!map.has(relPath)) map.set(relPath, []);
    map.get(relPath).push({ ...issue, channel_id: channelId });
  }
  return map;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const audit = loadAudit();
  const issues = (audit.issues || []).filter((item) => item.flag === "doc_gap" || item.flag === "undocumented_rejected");

  if (!issues.length) {
    console.log("[apply-doc-gap-backfill] no doc_gap issues in audit file.");
    process.exit(0);
  }

  const grouped = groupIssuesByDoc(issues);
  let totalRows = 0;
  const applied = [];

  for (const [relPath, docIssues] of grouped.entries()) {
    const count = appendRowsToDoc(relPath, docIssues, { dryRun });
    if (count > 0) {
      totalRows += count;
      applied.push(relPath);
      const params = [...new Set(docIssues.flatMap((i) => i.parameters || []))];
      if (!dryRun) patchManifest(relPath, params);
      console.log(`[apply] ${relPath}: +${count} row(s)`);
    }
  }

  const summaryPath = path.join(ROOT, "outputs/doc-gap-backfill-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    issue_count: issues.length,
    docs_updated: applied,
    rows_added: totalRows
  }, null, 2)}\n`);

  console.log(`\n[apply-doc-gap-backfill] ${dryRun ? "dry-run" : "done"}: ${applied.length} doc(s), ${totalRows} row(s)`);
  console.log(`→ ${path.relative(ROOT, summaryPath)}`);
  if (!dryRun && applied.length) {
    console.log("Run: npm run build:protocol-matrix");
  }
}

main();
