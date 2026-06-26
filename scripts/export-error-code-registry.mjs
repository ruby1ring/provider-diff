#!/usr/bin/env node
/**
 * Export error-code-registry.json from legacy JS (one-time bootstrap / --refresh).
 */
import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "web/lib/error-code-catalog.js");
const OUT = path.join(ROOT, "docs/errorcode/error-code-registry.json");

function main() {
  if (fs.existsSync(OUT) && !process.argv.includes("--refresh")) {
    console.log(`registry exists → ${path.relative(ROOT, OUT)} (use --refresh to re-export from legacy JS)`);
    return;
  }
  if (!fs.existsSync(SRC)) {
    throw new Error(`Missing ${SRC}. Cannot bootstrap error-code registry.`);
  }

  const src = fs.readFileSync(SRC, "utf8");
  const code = src.replace(/^[\s\S]*?window\.NOCTUA_ERROR_CODE_CATALOG\s*=\s*/, "").trim();
  const api = vm.runInNewContext(code, {}, { timeout: 5000 });
  if (!api) throw new Error("Failed to evaluate error-code-catalog.js");

  const payload = {
    docStatus: api.DOC_STATUS,
    canonicalShape: api.canonicalShape,
    scenarios: api.scenarios,
    channelOrder: api.channelOrder,
    channels: api.channels
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`export-error-code-registry → ${path.relative(ROOT, OUT)}`);
}

main();
