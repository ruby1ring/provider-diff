#!/usr/bin/env node
/**
 * Build web/data/thinking-observed.json from exported run reports.
 *
 * Usage:
 *   node scripts/build-thinking-observed.mjs
 *   node scripts/build-thinking-observed.mjs --input outputs/my-run.json
 *   node scripts/build-thinking-observed.mjs --input outputs/thinking-runs/
 */
import fs from "fs";
import path from "path";
import { buildThinkingObserved } from "./lib/thinking-probe-analysis.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MATRIX_PATH = path.join(ROOT, "web/data/protocol-matrix.json");
const OUT_PATH = path.join(ROOT, "web/data/thinking-observed.json");
const DEFAULT_INPUT_DIRS = [
  path.join(ROOT, "outputs"),
  path.join(ROOT, "outputs/thinking-probes")
];

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

function normalizeReport(raw, sourceFile) {
  if (!raw || typeof raw !== "object") return null;
  if (Array.isArray(raw)) {
    return normalizeReport({ results: raw }, sourceFile);
  }
  const suite = Array.isArray(raw.suites) ? raw.suites[0] : raw;
  const results = Array.isArray(suite.results) ? suite.results : Array.isArray(raw.results) ? raw.results : [];
  if (!results.length) return null;
  return {
    channel_id: raw.channel_id || suite.channel_id || raw.provider || suite.provider || "",
    endpoint_id: raw.endpoint_id || suite.endpoint_id || "chat_completions",
    protocol_id: raw.protocol_id || suite.protocol_id || raw.endpoint_id || "chat_completions",
    generated_at: raw.generated_at || suite.generated_at || raw.finished_at || null,
    source_file: sourceFile,
    results
  };
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

function loadReports(inputPaths) {
  const paths = inputPaths.length
    ? inputPaths.flatMap((p) => collectJsonFiles(p))
    : DEFAULT_INPUT_DIRS.flatMap((p) => collectJsonFiles(p));

  const reports = [];
  const seen = new Set();
  for (const file of paths) {
    if (file.endsWith("thinking-observed.json") || file.endsWith("protocol-matrix.json")) continue;
    try {
      const raw = loadJson(file);
      const report = normalizeReport(raw, path.relative(ROOT, file));
      if (!report) continue;
      const key = `${report.channel_id}::${report.endpoint_id}::${report.source_file}`;
      if (seen.has(key)) continue;
      seen.add(key);
      reports.push(report);
    } catch {
      // skip invalid JSON
    }
  }
  return reports.sort((a, b) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")));
}

function main() {
  const { inputs } = parseArgs(process.argv);
  const protocolMatrix = fs.existsSync(MATRIX_PATH) ? loadJson(MATRIX_PATH) : { protocols: {} };
  const reports = loadReports(inputs);
  const observed = buildThinkingObserved({ reports, protocolMatrix });
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(observed, null, 2)}\n`);
  const channelCount = Object.keys(observed.channels).length;
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)} (${channelCount} channel(s) from ${reports.length} report(s))`);
}

main();
