#!/usr/bin/env node
/**
 * Fetch official doc_url pages and compare parameter names with local docs/api/*.md.
 * Output: outputs/official-doc-compare.json
 *
 * Usage: npm run compare:official-docs
 *        node scripts/compare-official-api-docs.mjs [--apply-stale]
 */
import fs from "node:fs";
import path from "node:path";
import { PROTOCOL_DOC_MANIFEST } from "./protocol-doc-manifest.mjs";
import {
  parseFrontmatter,
  collectSpecsFromBody,
  stringifyFrontmatter
} from "./lib/md-parse.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_PATH = path.join(ROOT, "outputs/official-doc-compare.json");
const TODAY = new Date().toISOString().slice(0, 10);

const PARAM_HINTS = new Set([
  "temperature", "top_p", "top_k", "max_tokens", "max_completion_tokens", "max_output_tokens",
  "presence_penalty", "frequency_penalty", "stop", "seed", "n", "stream",
  "stream_options", "tools", "tool_choice", "response_format", "logprobs",
  "top_logprobs", "reasoning_effort", "thinking", "enable_thinking",
  "messages", "model", "user", "metadata", "parallel_tool_calls",
  "min_p", "repetition_penalty", "modalities", "audio", "logit_bias",
  "user_id", "reasoning", "input", "previous_response_id", "store",
  "service_tier", "prediction", "functions", "function_call"
]);

const OFFICIAL_PARAM_BLOCKLIST = /(_xxx|get_|your_|msg_|img_|file_xxx|x_)/i;

function isPlausibleParam(name = "") {
  if (!PARAM_HINTS.has(name)) return false;
  if (OFFICIAL_PARAM_BLOCKLIST.test(name)) return false;
  if (name.length > 40) return false;
  return true;
}

function extractOfficialParams(html = "") {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const found = new Set();
  for (const hint of PARAM_HINTS) {
    const patterns = [
      new RegExp(`["'\`]${hint}["'\`]`, "g"),
      new RegExp(`\\b${hint}\\b`, "g")
    ];
    for (const pattern of patterns) {
      if (pattern.test(text)) found.add(hint);
    }
  }

  for (const match of text.matchAll(/["']([a-z][a-z0-9_]{1,40})["']/g)) {
    const name = match[1];
    if (isPlausibleParam(name)) found.add(name);
  }
  return [...found].sort();
}

async function fetchOfficial(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Noctua-doc-compare/1.0 (+https://github.com/)",
        "Accept": "text/html,application/json,text/plain,*/*"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function localParams(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return { params: [], meta: {}, body: "" };
  const raw = fs.readFileSync(abs, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const specs = collectSpecsFromBody(body);
  const grouped = Object.values(meta.parameter_groups || {}).flat();
  const params = [...new Set([...Object.keys(specs), ...grouped])].sort();
  return { params, meta, body, raw };
}

function diffSets(local = [], official = []) {
  const localSet = new Set(local);
  const officialSet = new Set(official);
  return {
    local_only: local.filter((p) => !officialSet.has(p)),
    official_only: official.filter((p) => !localSet.has(p)),
    shared: local.filter((p) => officialSet.has(p))
  };
}

function appendObservedSection(body, entries) {
  const marker = "## 实测补充参数（来源：实测）";
  const header = "| Parameter | Type | Required | Default | Range | Notes |";
  const sep = "|---|---|---|---|---|---|";
  const rows = entries.map((entry) => {
    const note = entry.note || `来源：实测（Noctua，${TODAY}）；官方页面检索到该参数。`;
    return `| \`${entry.parameter}\` | \`${entry.type || "—"}\` | no | — | — | ${note} |`;
  }).join("\n");
  const block = `${marker}\n\n${header}\n${sep}\n${rows}\n`;

  if (body.includes(marker)) {
    return body.replace(
      new RegExp(`${marker}[\\s\\S]*?(?=\\n## |$)`),
      `${block.trim()}\n`
    );
  }
  return `${body.trim()}\n\n${block}`;
}

function applyOfficialOnly(relPath, officialOnly, manifestMeta) {
  if (!officialOnly.length) return false;
  const abs = path.join(ROOT, relPath);
  const { meta, body, raw } = localParams(relPath);
  const mergedMeta = { ...manifestMeta, ...meta };
  const entries = officialOnly.map((parameter) => ({
    parameter,
    type: "—",
    note: `来源：实测（Noctua，${TODAY}）；联网对照官方文档（${mergedMeta.doc_url || "—"}）检索到该参数，已补录。`
  }));
  let newBody = appendObservedSection(body, entries);

  const groups = { ...(mergedMeta.parameter_groups || {}) };
  if (!groups.Observed) groups.Observed = [];
  for (const p of officialOnly) {
    if (!groups.Observed.includes(p)) groups.Observed.push(p);
  }
  const newMeta = {
    ...mergedMeta,
    parameter_groups: groups,
    last_verified: TODAY,
    notes: `${mergedMeta.notes || ""} ${TODAY} 联网对照官方文档已补录参数：${officialOnly.join(", ")}。`.trim()
  };

  const output = `${stringifyFrontmatter(newMeta)}${newBody.startsWith("#") ? "" : ""}${newBody.startsWith("#") ? newBody : newBody}`;
  const fixed = raw.includes("---\n") ? `${stringifyFrontmatter(newMeta)}${newBody}` : output;
  fs.writeFileSync(abs, fixed.trimEnd() + "\n");
  return true;
}

async function main() {
  const applyStale = process.argv.includes("--apply-stale");
  const report = {
    generated_at: new Date().toISOString(),
    entries: [],
    summary: { checked: 0, conflicts: 0, official_only_total: 0, fetch_errors: 0 }
  };

  for (const [relPath, manifestMeta] of Object.entries(PROTOCOL_DOC_MANIFEST)) {
    if (manifestMeta.compare === false) continue;
    const docUrl = manifestMeta.doc_url;
    if (!docUrl) continue;

    const { params: local } = localParams(relPath);
    let official = [];
    let fetchError = "";

    try {
      const html = await fetchOfficial(docUrl);
      official = extractOfficialParams(html);
      report.summary.checked += 1;
    } catch (err) {
      fetchError = err.message || String(err);
      report.summary.fetch_errors += 1;
    }

    const diff = diffSets(local, official);
    const hasConflict = diff.official_only.length > 0 || diff.local_only.length > 0;
    if (hasConflict) report.summary.conflicts += 1;
    report.summary.official_only_total += diff.official_only.length;

    const entry = {
      relPath,
      channel_id: manifestMeta.channel_id,
      protocol_id: manifestMeta.protocol_id,
      doc_url: docUrl,
      local_count: local.length,
      official_count: official.length,
      diff,
      fetch_error: fetchError || null,
      action: null
    };

    if (applyStale && diff.official_only.length && !fetchError) {
      entry.action = applyOfficialOnly(relPath, diff.official_only, manifestMeta)
        ? "appended_observed_from_official"
        : "skipped";
    }

    report.entries.push(entry);
    const status = fetchError ? `ERR ${fetchError}` : `local=${local.length} official=${official.length} +${diff.official_only.length}/-${diff.local_only.length}`;
    console.log(`[compare] ${relPath}: ${status}`);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n→ ${path.relative(ROOT, OUT_PATH)}`);
  if (applyStale) console.log("Applied official-only parameters into local docs (实测补充 section).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
