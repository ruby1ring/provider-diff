#!/usr/bin/env node
/**
 * Build web/data/model-limits-observed.json from capacity-probe reports.
 *
 * Consumes two report shapes:
 *   - CLI reports from scripts/probe-capacity.js: { targets: [ { provider, model, probes: {...} } ] }
 *   - UI-exported run reports: { results: [ { category: "capacity", response_body: {...} } ] }
 *
 * Usage:
 *   node scripts/build-model-limits-observed.mjs
 *   node scripts/build-model-limits-observed.mjs --input outputs/capacity-probes/run.json
 *   node scripts/build-model-limits-observed.mjs --input outputs/capacity-probes/
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_PATH = path.join(ROOT, "web/data/model-limits-observed.json");
const DEFAULT_INPUT_DIRS = [
  path.join(ROOT, "outputs"),
  path.join(ROOT, "outputs/capacity-probes")
];
const METRIC_KINDS = ["max_input", "max_output", "max_output_effective", "total_context", "thinking_budget"];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectJsonFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  const files = [];
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const full = path.join(targetPath, entry.name);
    if (entry.isDirectory()) files.push(...collectJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}

function parseArgs(argv) {
  const args = { inputs: [] };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input" && argv[i + 1]) {
      args.inputs.push(path.resolve(argv[i + 1]));
      i += 1;
    }
  }
  return args;
}

function normModel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function metricFromSummary(kind, summary) {
  if (!summary || typeof summary !== "object") return null;
  if (kind === "max_output_effective") {
    return { kind, effective: Boolean(summary.effective), detail: summary.effective_detail || "" };
  }
  if (kind === "thinking_budget") {
    if (summary.skipped) return { kind, skipped: true, accepted: false, reason: summary.skip_reason || "" };
    return {
      kind,
      accepted: Boolean(summary.budget_accepted),
      max: summary.budget_max ?? null,
      max_display: summary.budget_max_display || "",
      effective: Boolean(summary.effective),
      budget_respected: summary.budget_respected !== false,
      field: summary.thinking_field || ""
    };
  }
  return {
    kind,
    value: summary.supported_max ?? null,
    display: summary.supported_max_display || "",
    upper_bound_found: Boolean(summary.upper_bound_found),
    top_candidate_supported: Boolean(summary.top_candidate_supported),
    context_method: summary.context_method || undefined
  };
}

function kindFromResult(result) {
  const bodyKind = result?.response_body?.kind;
  if (METRIC_KINDS.includes(bodyKind)) return bodyKind;
  const id = String(result?.case_id || "");
  if (id.includes("capacity_max_output_effective")) return "max_output_effective";
  if (id.includes("capacity_max_input")) return "max_input";
  if (id.includes("capacity_thinking_budget")) return "thinking_budget";
  if (id.includes("capacity_max_output")) return "max_output";
  if (id.includes("capacity_total_context")) return "total_context";
  return "";
}

/** Collect { channelId, model, generatedAt, metrics } records from one report file. */
function recordsFromReport(raw, generatedAtFallback) {
  const records = [];
  const generatedAt = raw?.generated_at || raw?.finished_at || generatedAtFallback;

  // CLI shape: targets[].probes
  if (Array.isArray(raw?.targets)) {
    for (const target of raw.targets) {
      if (!target || target.skipped) continue;
      const channelId = target.channel_id || target.provider || "";
      const model = target.model || "";
      if (!channelId || !model) continue;
      const metrics = {};
      for (const kind of METRIC_KINDS) {
        const summary = target.probes?.[kind];
        const metric = metricFromSummary(kind, summary);
        if (metric) metrics[kind] = metric;
      }
      if (Object.keys(metrics).length) records.push({ channelId, model, generatedAt, metrics });
    }
  }

  // UI shape: results[] with capacity response bodies
  const results = Array.isArray(raw?.results)
    ? raw.results
    : Array.isArray(raw?.suites?.[0]?.results)
      ? raw.suites[0].results
      : [];
  const byTarget = new Map();
  for (const result of results) {
    const kind = kindFromResult(result);
    if (!kind) continue;
    const channelId = result.channel_id || result.provider || raw?.channel_id || raw?.provider || "";
    const model = result.model || raw?.model || "";
    if (!channelId || !model) continue;
    const key = `${channelId}::${model}`;
    if (!byTarget.has(key)) byTarget.set(key, { channelId, model, generatedAt, metrics: {} });
    const metric = metricFromSummary(kind, result.response_body);
    if (metric) byTarget.get(key).metrics[kind] = metric;
  }
  for (const record of byTarget.values()) {
    if (Object.keys(record.metrics).length) records.push(record);
  }
  return records;
}

function buildObserved(reports) {
  const channels = {};
  const models = {};
  // reports are newest-first; first write wins so newer data is kept.
  for (const { records } of reports) {
    for (const record of records) {
      channels[record.channelId] = channels[record.channelId] || {};
      const existing = channels[record.channelId][record.model];
      if (existing) {
        for (const [kind, metric] of Object.entries(record.metrics)) {
          if (!existing.metrics[kind]) existing.metrics[kind] = metric;
        }
      } else {
        channels[record.channelId][record.model] = {
          generatedAt: record.generatedAt || null,
          metrics: { ...record.metrics }
        };
      }
      const norm = normModel(record.model);
      models[norm] = models[norm] || [];
      if (!models[norm].some((entry) => entry.channelId === record.channelId && entry.model === record.model)) {
        models[norm].push({ channelId: record.channelId, model: record.model });
      }
    }
  }
  return { generatedAt: new Date().toISOString(), channels, models };
}

function main() {
  const { inputs } = parseArgs(process.argv);
  const paths = inputs.length
    ? inputs.flatMap((p) => collectJsonFiles(p))
    : DEFAULT_INPUT_DIRS.flatMap((p) => collectJsonFiles(p));

  const reports = [];
  const seen = new Set();
  for (const file of paths) {
    if (file.endsWith("model-limits-observed.json")
      || file.endsWith("thinking-observed.json")
      || file.endsWith("protocol-matrix.json")) continue;
    try {
      const raw = loadJson(file);
      const generatedAtFallback = fs.statSync(file).mtime.toISOString();
      const records = recordsFromReport(raw, generatedAtFallback);
      if (!records.length) continue;
      const key = path.relative(ROOT, file);
      if (seen.has(key)) continue;
      seen.add(key);
      reports.push({ file: key, generatedAt: raw?.generated_at || generatedAtFallback, records });
    } catch {
      // skip invalid JSON
    }
  }
  reports.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));

  const observed = buildObserved(reports);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(observed, null, 2)}\n`);
  const channelCount = Object.keys(observed.channels).length;
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)} (${channelCount} channel(s) from ${reports.length} report(s))`);
}

main();
