#!/usr/bin/env node
/**
 * Rebuild generated JSON catalogs when source markdown is newer than outputs.
 * Used by dev.js on startup and available as npm run rebuild:docs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { newestMtime } from "./lib/md-parse.mjs";
import { MANIFEST_LOCAL_DOC_PATHS } from "./protocol-doc-manifest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const PROTOCOL_OUT = path.join(ROOT, "web/data/protocol-matrix.json");
const ERROR_OUT = path.join(ROOT, "web/data/error-code-catalog.json");
const PROTOCOL_REGISTRY = path.join(ROOT, "docs/api/protocol-channel-registry.json");
const ERROR_REGISTRY = path.join(ROOT, "docs/errorcode/error-code-registry.json");

const PROTOCOL_SCRIPTS = [
  path.join(ROOT, "scripts/build-protocol-matrix.mjs"),
  path.join(ROOT, "scripts/protocol-doc-manifest.mjs"),
  path.join(ROOT, "scripts/lib/md-parse.mjs")
];

const ERROR_SCRIPTS = [
  path.join(ROOT, "scripts/build-error-code-catalog.mjs"),
  path.join(ROOT, "scripts/export-error-code-registry.mjs"),
  path.join(ROOT, "scripts/lib/md-parse.mjs")
];

function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(dir, name));
}

function needsRebuild(sources, output, extraSources = []) {
  if (!fs.existsSync(output)) return true;
  const outMtime = fs.statSync(output).mtimeMs;
  const newestSource = newestMtime([...sources, ...extraSources]);
  return newestSource > outMtime;
}

export function rebuildDocs({ force = false } = {}) {
  const protocolMd = MANIFEST_LOCAL_DOC_PATHS.map((rel) => path.join(ROOT, rel));
  const errorMd = listMdFiles(path.join(ROOT, "docs/errorcode"));

  const rebuildProtocol = force || needsRebuild(
    [...protocolMd, PROTOCOL_REGISTRY, ...PROTOCOL_SCRIPTS],
    PROTOCOL_OUT
  );
  const rebuildError = force || needsRebuild(
    [...errorMd, ERROR_REGISTRY, ...ERROR_SCRIPTS],
    ERROR_OUT
  );

  if (rebuildProtocol) {
    console.log("[rebuild-docs] protocol-matrix.json is stale → rebuilding");
    execSync("node scripts/inject-protocol-frontmatter.mjs", { cwd: ROOT, stdio: "inherit" });
    execSync("node scripts/build-protocol-matrix.mjs", { cwd: ROOT, stdio: "inherit" });
  } else {
    console.log("[rebuild-docs] protocol-matrix.json up to date");
  }

  if (rebuildError) {
    console.log("[rebuild-docs] error-code-catalog.json is stale → rebuilding");
    if (!fs.existsSync(ERROR_REGISTRY)) {
      execSync("node scripts/export-error-code-registry.mjs", { cwd: ROOT, stdio: "inherit" });
    }
    execSync("node scripts/build-error-code-catalog.mjs", { cwd: ROOT, stdio: "inherit" });
  } else {
    console.log("[rebuild-docs] error-code-catalog.json up to date");
  }

  return { rebuildProtocol, rebuildError };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const force = process.argv.includes("--force");
  rebuildDocs({ force });
}
