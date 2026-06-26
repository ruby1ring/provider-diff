#!/usr/bin/env node
/**
 * Audit protocol docs: types in parameter tables should match stored specs verbatim.
 * Run: node scripts/audit-protocol-types.mjs
 */
import fs from "fs";
import path from "path";
import { PROTOCOL_DOC_MANIFEST } from "./protocol-doc-manifest.mjs";
import { parseFrontmatter, parseMarkdownTables, rowToSpec } from "./lib/md-parse.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP = new Set(["model", "messages", "input"]);

function documentedRequestTypes(body) {
  const parts = body.split(/^## /m);
  const section = parts.find((p) => /^Documented Request Parameters/i.test(p));
  if (!section) return new Map();
  const chunk = section.replace(/^[^\n]*\n/, "").split(/^## /m)[0];
  const out = new Map();
  for (const table of parseMarkdownTables(chunk)) {
    const header = table.header.map((h) => h.toLowerCase());
    const hasType = header.some((h) => h === "type" || h.startsWith("type /"));
    if (!hasType) continue;
    if (!header.some((h) => h.includes("parameter") || h.includes("field"))) continue;
    const typeIdx = header.findIndex((h) => h === "type" || h.startsWith("type /"));
    for (const row of table.rows) {
      const parsed = rowToSpec(row, table.header);
      if (!parsed || parsed.parameter === "Field") continue;
      const rawCell = (row[typeIdx] || "").replace(/`/g, "").trim();
      out.set(parsed.parameter, { rawCell, stored: parsed.spec.type, spec: parsed.spec });
    }
  }
  return out;
}

let issues = 0;
for (const [relPath, manifest] of Object.entries(PROTOCOL_DOC_MANIFEST)) {
  if (manifest.compare === false) continue;
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) continue;
  const { meta: fm, body } = parseFrontmatter(fs.readFileSync(abs, "utf8"));
  const meta = { ...manifest, ...fm };
  const types = documentedRequestTypes(body);
  const channelIssues = [];
  for (const [param, { rawCell, stored, spec }] of types) {
    if (SKIP.has(param)) continue;
    if (spec.effective === "deprecated") continue;
    const rawNorm = rawCell
      .replace(/`/g, "")
      .trim()
      .replace(/\\\|/g, "|")
      .split("|")
      .map((s) => s.trim().replace(/\\$/, ""))
      .filter((s) => s && s.toLowerCase() !== "null")
      .join(" | ");
    if (stored !== rawNorm) {
      channelIssues.push(`${param}: doc=${rawNorm} stored=${stored}`);
    }
  }
  if (channelIssues.length) {
    console.log(`\n${meta.channel_id}/${meta.protocol_id} (${relPath})`);
    for (const line of channelIssues) console.log(`  ${line}`);
    issues += channelIssues.length;
  }
}

if (issues) {
  console.log(`\n${issues} type fidelity issue(s)`);
  process.exit(1);
}
console.log("All compare-channel request parameter types match official doc tables verbatim.");
