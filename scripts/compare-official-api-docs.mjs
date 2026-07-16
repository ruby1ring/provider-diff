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
  // 只保留 code/pre/table 里的内容再匹配参数名。此前对全文做 \b 词边界匹配，
  // 会把正文散文里的普通英文单词（user / input / thinking …）误判为 API 参数，
  // 导致错误参数被补录进 docs（2026-07-08 曾因此误录 DeepSeek `user`、MiniMax `n/stop` 等）。
  const codeChunks = [];
  for (const match of html.matchAll(/<(code|pre|td|th)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    codeChunks.push(match[2]);
  }
  const codeText = codeChunks
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ");

  const found = new Set();
  for (const hint of PARAM_HINTS) {
    // code/表格上下文里的精确 token：引号包裹，或独立成词（键名、单元格）
    const quoted = new RegExp(`["'\`]${hint}["'\`]`);
    const bareToken = new RegExp(`(^| )${hint}( |$|[:=])`);
    if (quoted.test(codeText) || bareToken.test(codeText)) found.add(hint);
  }

  for (const match of codeText.matchAll(/["']([a-z][a-z0-9_]{1,40})["']/g)) {
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

// 「实测补充参数（来源：实测）」段只允许由真实跑测的回写脚本
// （apply-doc-gap-backfill.mjs）写入。本脚本的数据来源是官方文档页面对照，
// 不是实测，必须写进独立的「官方文档对照」段并标注待实测（规则 1.1.3：实测标注只给实测数据）。
const DOC_SYNC_MARKER = "## 官方文档对照补充参数（来源：官方文档，待实测）";

function appendDocSyncSection(body, entries) {
  const header = "| Parameter | Type | Required | Default | Range | Notes |";
  const sep = "|---|---|---|---|---|---|";
  const rows = entries.map((entry) => {
    const note = entry.note || `来源：官方文档对照（Noctua doc-sync，${TODAY}）；待实测验证。`;
    return `| \`${entry.parameter}\` | \`${entry.type || "—"}\` | no | — | — | ${note} |`;
  }).join("\n");
  const block = `${DOC_SYNC_MARKER}\n\n${header}\n${sep}\n${rows}\n`;

  if (body.includes(DOC_SYNC_MARKER)) {
    return body.replace(
      new RegExp(`${DOC_SYNC_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?(?=\\n## |$)`),
      `${block.trim()}\n`
    );
  }
  return `${body.trim()}\n\n${block}`;
}

function applyOfficialOnly(relPath, officialOnly, manifestMeta) {
  if (!officialOnly.length) return false;
  const abs = path.join(ROOT, relPath);
  const { meta, body } = localParams(relPath);
  const mergedMeta = { ...manifestMeta, ...meta };
  const entries = officialOnly.map((parameter) => ({
    parameter,
    type: "—",
    note: `来源：官方文档对照（Noctua doc-sync，${TODAY}）；官方文档（${mergedMeta.doc_url || "—"}）记载该参数、本地未收录，结论待实测验证。`
  }));
  const newBody = appendDocSyncSection(body, entries);

  const groups = { ...(mergedMeta.parameter_groups || {}) };
  if (!groups.DocSync) groups.DocSync = [];
  for (const p of officialOnly) {
    if (!groups.DocSync.includes(p)) groups.DocSync.push(p);
  }
  const newMeta = {
    ...mergedMeta,
    parameter_groups: groups,
    last_verified: TODAY,
    notes: `${mergedMeta.notes || ""} ${TODAY} 联网对照官方文档发现未收录参数（待实测）：${officialOnly.join(", ")}。`.trim()
  };

  fs.writeFileSync(abs, `${stringifyFrontmatter(newMeta)}${newBody}`.trimEnd() + "\n");
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
  if (applyStale) console.log("Applied official-only parameters into local docs（官方文档对照段，待实测；不写入实测段）.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
