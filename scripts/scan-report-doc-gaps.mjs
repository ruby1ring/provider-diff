#!/usr/bin/env node
/**
 * Scan exported reports / JSON result files for doc_gap and undocumented_rejected issues.
 * Usage: npm run scan:doc-gaps
 *        node scripts/scan-report-doc-gaps.mjs [file.json ...]
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { resolveChannelId } from "./lib/channel-doc-map.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const diagPath = path.join(ROOT, "web/lib/parameter-diagnosis.js");
const diagCode = fs.readFileSync(diagPath, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(diagCode, sandbox);
const diag = sandbox.window.NOCTUA_PARAMETER_DIAGNOSIS;

const DEFAULT_INPUTS = [
  path.join(ROOT, "outputs/channel-reports-export.json"),
  path.join(ROOT, "outputs/doc-gap-audit.json")
];

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".json") && name !== "doc-gap-audit.json" && name !== "official-doc-compare.json")
    .map((name) => path.join(dir, name));
}

function collectResultArrays(node, out = [], context = {}) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    if (node.length && node[0]?.case_id && (node[0].support_conclusion || node[0].http_status !== undefined)) {
      out.push({ results: node, context });
    }
    for (const item of node) collectResultArrays(item, out, context);
    return out;
  }

  const nextContext = { ...context };
  if (node.channel_id) nextContext.channel_id = node.channel_id;
  if (node.protocol_id) nextContext.protocol_id = node.protocol_id;
  if (node.provider) nextContext.channel_id = nextContext.channel_id || node.provider;

  if (Array.isArray(node.results)) out.push({ results: node.results, context: nextContext });
  if (Array.isArray(node.channel_reports)) {
    for (const record of node.channel_reports) {
      const recordContext = {
        channel_id: record.channel_id || record.provider,
        protocol_id: record.protocol_id
      };
      if (Array.isArray(record.results)) out.push({ results: record.results, context: recordContext });
    }
  }
  if (Array.isArray(node.history_reports)) {
    for (const record of node.history_reports) {
      const recordContext = {
        channel_id: record.channel_id || record.provider,
        protocol_id: record.endpoint_id
      };
      if (Array.isArray(record.results)) out.push({ results: record.results, context: recordContext });
    }
  }
  if (Array.isArray(node.records)) {
    for (const record of node.records) {
      const recordContext = {
        channel_id: record.channel_id || record.provider,
        protocol_id: record.protocol_id
      };
      if (Array.isArray(record.results)) out.push({ results: record.results, context: recordContext });
    }
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectResultArrays(value, out, nextContext);
  }
  return out;
}

function collectThinkingObservedIssues() {
  const observedPath = path.join(ROOT, "web/data/thinking-observed.json");
  if (!fs.existsSync(observedPath)) return [];
  const data = JSON.parse(fs.readFileSync(observedPath, "utf8"));
  const issues = [];
  for (const [channelId, protocols] of Object.entries(data.channels || {})) {
    for (const [protocolId, params] of Object.entries(protocols || {})) {
      for (const [param, meta] of Object.entries(params || {})) {
        if (meta?.thinking_effectiveness !== "doc_gap") continue;
        issues.push({
          case_id: (meta.case_ids || [])[0] || `thinking_${param}`,
          title: `Thinking 参数 ${param}`,
          channel_name: channelId,
          channel_id: channelId,
          protocol_id: protocolId,
          flag: "doc_gap",
          flag_meta: diag.DIAGNOSTIC_FLAGS.doc_gap,
          message: "矩阵未列但 thinking 探针实测有效",
          parameters: [param],
          source_file: "web/data/thinking-observed.json"
        });
      }
    }
  }
  return issues;
}

function enrichIssue(issue, context, filePath) {
  const channel_id = issue.channel_id
    || context.channel_id
    || resolveChannelId(issue.channel_name);
  return {
    ...issue,
    channel_id,
    protocol_id: issue.protocol_id || context.protocol_id || "chat_completions",
    source_file: path.relative(ROOT, filePath)
  };
}

function loadReport(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function main() {
  let inputs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  if (!inputs.length) {
    inputs = [
      ...DEFAULT_INPUTS.filter((p) => fs.existsSync(p)),
      ...listJsonFiles(path.join(ROOT, "outputs"))
    ];
    inputs = [...new Set(inputs)];
  }

  const audit = {
    generated_at: new Date().toISOString(),
    files: [],
    summary: { doc_gap: 0, undocumented_rejected: 0, total: 0 },
    issues: []
  };

  if (!inputs.length) {
    console.warn("[scan] no report JSON found in outputs/ — export channel reports first:");
    console.warn("  node scripts/export-channel-reports-from-browser.mjs");
  }

  for (const input of inputs) {
    const filePath = path.resolve(input);
    if (!fs.existsSync(filePath)) {
      console.warn(`[skip] not found: ${filePath}`);
      continue;
    }
    let data;
    try {
      data = loadReport(filePath);
    } catch (err) {
      console.warn(`[skip] invalid JSON: ${filePath} (${err.message})`);
      continue;
    }
    const arrays = collectResultArrays(data);
    const fileIssues = [];
    for (const { results, context } of arrays) {
      for (const issue of diag.scanResultsForDocIssues(results)) {
        fileIssues.push(enrichIssue(issue, context, filePath));
      }
    }
    audit.files.push({ path: path.relative(ROOT, filePath), issue_count: fileIssues.length });
    audit.issues.push(...fileIssues);
  }

  const thinkingIssues = collectThinkingObservedIssues();
  if (thinkingIssues.length) {
    audit.issues.push(...thinkingIssues);
    audit.files.push({ path: "web/data/thinking-observed.json", issue_count: thinkingIssues.length });
  }

  const deduped = new Map();
  for (const issue of audit.issues) {
    const key = `${issue.channel_id}|${issue.case_id}|${issue.flag}|${(issue.parameters || []).join(",")}`;
    if (!deduped.has(key)) deduped.set(key, issue);
  }
  audit.issues = [...deduped.values()];

  for (const issue of audit.issues) {
    audit.summary.total += 1;
    if (issue.flag === "doc_gap") audit.summary.doc_gap += 1;
    if (issue.flag === "undocumented_rejected") audit.summary.undocumented_rejected += 1;
  }

  const outPath = path.join(ROOT, "outputs/doc-gap-audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(`[scan-report-doc-gaps] ${audit.summary.total} issues → ${path.relative(ROOT, outPath)}`);
  console.log(`  doc_gap: ${audit.summary.doc_gap}, undocumented_rejected: ${audit.summary.undocumented_rejected}`);
}

main();
