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

function loadRegistrySync() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    execSync("node scripts/export-error-code-registry.mjs", { cwd: ROOT, stdio: "inherit" });
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function parseHttpCell(cell) {
  const m = String(cell || "").match(/(\d{3})/);
  return m ? Number(m[1]) : null;
}

function parseErrorEntriesFromMd(body) {
  const entries = [];
  const seen = new Set();

  for (const table of parseMarkdownTables(body)) {
    const header = table.header.map((h) => h.toLowerCase());
    const httpIdx = header.findIndex((h) => h.includes("http"));
    if (httpIdx < 0) continue;

    const codeIdx = header.findIndex((h) => h.includes("type") || h.includes("code") || h.includes("错误码"));
    const msgIdx = header.findIndex((h) => h.includes("message") || h.includes("描述") || h.includes("代表"));

    for (const row of table.rows) {
      const http = parseHttpCell(row[httpIdx]);
      if (!http) continue;

      let nativeCode = null;
      let nativeType = null;
      const codeCell = codeIdx >= 0 ? row[codeIdx] : "";
      const message = msgIdx >= 0 ? row[msgIdx].replace(/\*\*/g, "").trim() : "";

      if (codeCell) {
        const cleaned = codeCell.replace(/`/g, "").trim();
        if (/^\d+$/.test(cleaned)) nativeCode = cleaned;
        else if (cleaned.includes("/")) {
          const parts = cleaned.split("/").map((p) => p.trim());
          nativeType = parts[0];
          nativeCode = parts[0];
        } else {
          nativeType = cleaned;
          nativeCode = cleaned;
        }
      }

      const key = `${http}::${nativeCode || ""}::${nativeType || ""}::${message.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ http, nativeCode, nativeType, message: message || null });
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
    const mdEntries = parseErrorEntriesFromMd(body);
    const before = channel.entries?.length || 0;
    channel.entries = mergeEntries(channel.entries || [], mdEntries);
    reports.push({
      channelId,
      localDoc,
      registryEntries: before,
      mdParsed: mdEntries.length,
      merged: channel.entries.length
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
    console.log(`  · ${r.channelId}: registry ${r.registryEntries} + md ${r.mdParsed} → ${r.merged} entries`);
  }
}

main();
