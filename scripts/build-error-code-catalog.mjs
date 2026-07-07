#!/usr/bin/env node
/**
 * Build web/data/error-code-catalog.json from registry + docs/errorcode/*.md
 */
import fs from "fs";
import path from "path";
import { parseFrontmatter, parseMarkdownTables } from "./lib/md-parse.mjs";

import { execSync } from "child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "docs/errorcode/error-code-registry.json");
const OUT_PATH = path.join(ROOT, "web/data/error-code-catalog.json");

/** MiniMax numeric codes → inferred HTTP (LLM chat 场景) */
const MINIMAX_CODE_HTTP = {
  1002: 429,
  1004: 401,
  1008: 402,
  1024: 500,
  1026: 400,
  1027: 400,
  1039: 429,
  2013: 400,
  2049: 401
};

function loadRegistrySync() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    execSync("node scripts/export-error-code-registry.mjs", { cwd: ROOT, stdio: "inherit" });
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function parseHttpCell(cell) {
  const text = String(cell || "").trim();
  if (/^0$/.test(text)) return 0;
  const embedded = text.match(/(\d{3})/);
  return embedded ? Number(embedded[1]) : null;
}

function findMessageColumnIndex(header) {
  return header.findIndex((h) =>
    h.includes("message")
    || h.includes("描述")
    || h.includes("代表")
    || h.includes("错误信息")
    || h.includes("说明")
    || h.includes("description")
    || h.includes("详细描述")
    || h.includes("solution"));
}

function findCodeColumnIndex(header) {
  const bizIdx = header.findIndex((h) => h.includes("业务错误码"));
  if (bizIdx >= 0) return bizIdx;
  const errIdx = header.findIndex((h) => h.includes("错误码") && !h.includes("http"));
  if (errIdx >= 0) return errIdx;
  const typeIdx = header.findIndex((h) => h.includes("error type") || h === "error type");
  if (typeIdx >= 0) return typeIdx;
  return header.findIndex((h) =>
    (h.includes("code") || h.includes("type"))
    && !h.includes("http")
    && !h.includes("status"));
}

function pushEntry(entries, seen, entry) {
  if (!entry?.http && entry?.http !== 0) return;
  const key = `${entry.http}::${entry.nativeCode || ""}::${entry.nativeType || ""}::${(entry.message || "").slice(0, 40)}`;
  if (seen.has(key)) return;
  seen.add(key);
  entries.push(entry);
}

function parseCodeCell(codeCell) {
  let nativeCode = null;
  let nativeType = null;
  if (!codeCell) return { nativeCode, nativeType };

  const cleaned = codeCell.replace(/`/g, "").replace(/\\/g, "").trim();
  if (/^\d+$/.test(cleaned)) {
    nativeCode = cleaned;
    return { nativeCode, nativeType };
  }
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/").map((p) => p.trim());
    nativeType = parts[0];
    nativeCode = parts[0];
    return { nativeCode, nativeType };
  }
  nativeType = cleaned;
  nativeCode = cleaned;
  return { nativeCode, nativeType };
}

function parseStandardHttpTables(body) {
  const entries = [];
  const seen = new Set();

  for (const table of parseMarkdownTables(body)) {
    const header = table.header.map((h) => h.toLowerCase());
    const httpIdx = header.findIndex((h) => h.includes("http"));
    if (httpIdx < 0) continue;

    const codeIdx = findCodeColumnIndex(header);
    const msgIdx = findMessageColumnIndex(header);

    for (const row of table.rows) {
      const http = parseHttpCell(row[httpIdx]);
      if (http === null) continue;

      const codeCell = codeIdx >= 0 ? row[codeIdx] : "";
      const message = msgIdx >= 0 ? row[msgIdx].replace(/\*\*/g, "").trim() : "";
      const { nativeCode, nativeType } = parseCodeCell(codeCell);

      pushEntry(entries, seen, {
        http,
        nativeCode,
        nativeType,
        message: message || null
      });
    }
  }

  return entries;
}

/** DeepSeek: |错误码|描述| with cells like `400 - 格式错误` */
function parseDeepseekErrorTable(body) {
  const entries = [];
  const seen = new Set();

  for (const table of parseMarkdownTables(body)) {
    const header = table.header.map((h) => h.toLowerCase());
    if (!header.some((h) => h.includes("错误码"))) continue;
    if (header.some((h) => h.includes("http"))) continue;

    const codeIdx = header.findIndex((h) => h.includes("错误码"));
    const msgIdx = header.findIndex((h) => h.includes("描述"));
    if (codeIdx < 0) continue;

    for (const row of table.rows) {
      const codeCell = row[codeIdx].replace(/\*\*/g, "").replace(/\\/g, "").trim();
      const http = parseHttpCell(codeCell);
      if (http === null) continue;
      const message = msgIdx >= 0 ? row[msgIdx].replace(/\*\*/g, "").replace(/<br\s*\/?>/gi, " ").trim() : "";
      pushEntry(entries, seen, {
        http,
        nativeCode: String(http),
        nativeType: null,
        message: message || null
      });
    }
  }

  return entries;
}

/** Moonshot: ### 400 — 请求错误 + tables with error type / message */
function parseMoonshotErrorTables(body) {
  const entries = [];
  const seen = new Set();
  const parts = body.split(/^###\s*(\d{3})\s*[—-]/m);

  for (let i = 1; i < parts.length; i += 2) {
    const http = Number(parts[i]);
    const section = parts[i + 1] || "";
    if (!Number.isFinite(http)) continue;

    for (const table of parseMarkdownTables(section)) {
      const header = table.header.map((h) => h.toLowerCase());
      const typeIdx = header.findIndex((h) => h.includes("error type") || h.includes("type"));
      const msgIdx = header.findIndex((h) => h.includes("error message") || h.includes("message"));
      const detailIdx = header.findIndex((h) => h.includes("详细描述"));
      if (typeIdx < 0) continue;

      for (const row of table.rows) {
        const nativeType = row[typeIdx].replace(/`/g, "").trim();
        const message = (msgIdx >= 0 ? row[msgIdx] : row[detailIdx] || "").replace(/\*\*/g, "").trim();
        pushEntry(entries, seen, {
          http,
          nativeCode: null,
          nativeType,
          message: message || null
        });
      }
    }
  }

  return entries;
}

/** MiniMax: | Error Code | Message | — infer HTTP from known codes */
function parseMinimaxErrorTable(body) {
  const entries = [];
  const seen = new Set();

  for (const table of parseMarkdownTables(body)) {
    const header = table.header.map((h) => h.toLowerCase());
    const codeIdx = header.findIndex((h) => h.includes("error code") || h === "error code");
    const msgIdx = header.findIndex((h) => h.includes("message"));
    if (codeIdx < 0 || msgIdx < 0) continue;
    if (header.some((h) => h.includes("http"))) continue;

    for (const row of table.rows) {
      const code = row[codeIdx].replace(/`/g, "").trim();
      if (!/^\d+$/.test(code)) continue;
      const http = MINIMAX_CODE_HTTP[Number(code)];
      if (!http) continue;
      const message = row[msgIdx].replace(/\*\*/g, "").trim();
      pushEntry(entries, seen, {
        http,
        nativeCode: code,
        nativeType: null,
        message: message || null
      });
    }
  }

  return entries;
}

function parseErrorEntriesFromMd(body) {
  const seen = new Set();
  const entries = [];
  for (const batch of [
    parseStandardHttpTables(body),
    parseDeepseekErrorTable(body),
    parseMoonshotErrorTables(body),
    parseMinimaxErrorTable(body)
  ]) {
    for (const entry of batch) {
      pushEntry(entries, seen, entry);
    }
  }
  return entries;
}

function mergeEntries(registryEntries, mdEntries) {
  if (!mdEntries.length) return registryEntries;
  const byKey = new Map(registryEntries.map((e) => [`${e.http}::${e.nativeCode || e.nativeType}`, e]));
  for (const entry of mdEntries) {
    const key = `${entry.http}::${entry.nativeCode || entry.nativeType}`;
    if (!byKey.has(key) && entry.message) byKey.set(key, entry);
  }
  return [...byKey.values()];
}

function main() {
  const registry = loadRegistrySync();
  const channels = structuredClone(registry.channels);
  const reports = [];

  for (const [channelId, channel] of Object.entries(channels)) {
    const localDoc = channel.localDoc;
    if (!localDoc) continue;
    const abs = path.join(ROOT, localDoc);
    if (!fs.existsSync(abs)) continue;

    const { body } = parseFrontmatter(fs.readFileSync(abs, "utf8"));
    const mdEntries = channel.mdMerge === false ? [] : parseErrorEntriesFromMd(body);
    const before = channel.entries?.length || 0;
    channel.entries = mergeEntries(channel.entries || [], mdEntries);
    reports.push({
      channelId,
      localDoc,
      registryEntries: before,
      mdParsed: mdEntries.length,
      merged: channel.entries.length,
      mdMerge: channel.mdMerge !== false
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    docStatus: registry.docStatus,
    canonicalShape: registry.canonicalShape,
    scenarios: registry.scenarios,
    channelOrder: registry.channelOrder,
    channels
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");

  console.log("build-error-code-catalog:");
  console.log(`  output → ${path.relative(ROOT, OUT_PATH)}`);
  for (const r of reports) {
    const mergeNote = r.mdMerge ? "" : " (mdMerge off)";
    console.log(`  · ${r.channelId}: registry ${r.registryEntries} + md ${r.mdParsed} → ${r.merged} entries${mergeNote}`);
  }
}

main();
