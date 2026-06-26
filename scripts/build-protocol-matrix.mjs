#!/usr/bin/env node
/**
 * Build web/data/protocol-matrix.json from docs/api/*.md + registry.
 * Parameter `type` values must match each channel's official API docs verbatim
 * (no cross-channel normalization). Run: node scripts/build-protocol-matrix.mjs
 */
import fs from "fs";
import path from "path";
import { PROTOCOL_DOC_MANIFEST } from "./protocol-doc-manifest.mjs";
import {
  parseFrontmatter,
  collectSpecsFromBody,
  findSectionTables,
  rowToSpec,
  normalizeParameterName
} from "./lib/md-parse.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "docs/api/protocol-channel-registry.json");
const OUT_PATH = path.join(ROOT, "web/data/protocol-matrix.json");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function resolveRequired(channelId, protocolId, meta, registry) {
  if (Array.isArray(meta.required_parameters)) return meta.required_parameters;
  const overrideKey = `${channelId}::${protocolId}`;
  if (registry.protocolRequiredOverrides?.[overrideKey]) {
    return registry.protocolRequiredOverrides[overrideKey];
  }
  return registry.protocolDefaultRequired?.[protocolId] || [];
}

function docStatusMeta(statusKey, registry) {
  const meta = registry.docStatus?.[statusKey] || registry.docStatus?.missing;
  return {
    docStatus: statusKey,
    docStatusLabel: meta?.label || "待补充",
    docStatusClass: meta?.className || "protocol-doc-badge--missing"
  };
}

function parseRequiredFields(body) {
  const tables = findSectionTables(body, /Required (Request Fields|Body Fields)/i);
  const specs = {};
  for (const table of tables) {
    for (const row of table.rows) {
      const parsed = rowToSpec(row, table.header);
      if (!parsed) continue;
      specs[parsed.parameter] = parsed.spec;
    }
  }
  return specs;
}

function buildEntry(relPath, manifestFallback, registry) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;

  const raw = fs.readFileSync(abs, "utf8");
  const { meta: fm, body } = parseFrontmatter(raw);
  const meta = { ...manifestFallback, ...fm };
  const channelId = meta.channel_id;
  const protocolId = meta.protocol_id;
  if (!channelId || !protocolId) return null;

  const requiredParameters = resolveRequired(channelId, protocolId, meta, registry);
  const parameterGroups = meta.parameter_groups || meta.parameterGroups || {};
  const specs = { ...parseRequiredFields(body), ...collectSpecsFromBody(body) };

  const status = docStatusMeta(meta.doc_status || "verified", registry);
  const docMeta = {
    ...status,
    docUrl: meta.doc_url || null,
    localDoc: relPath,
    notes: meta.notes || "",
    inheritsFrom: null
  };

  return {
    channelId,
    protocolId,
    entry: {
      compare: meta.compare !== false,
      docMeta,
      requiredParameters,
      parameters: parameterGroups,
      specs
    },
    report: {
      relPath,
      channelId,
      protocolId,
      specCount: Object.keys(specs).length,
      groupCount: Object.values(parameterGroups).flat().length,
      requiredCount: requiredParameters.length
    }
  };
}

function buildStaticEntry(channelId, protocolId, staticEntry, registry) {
  const requiredParameters = staticEntry.requiredParameters
    || registry.protocolDefaultRequired?.[protocolId]
    || [];
  const status = docStatusMeta(staticEntry.docStatus || "missing", registry);
  return {
    channelId,
    protocolId,
    entry: {
      compare: staticEntry.compare !== false,
      docMeta: {
        ...status,
        docUrl: staticEntry.docUrl || null,
        localDoc: staticEntry.localDoc || null,
        notes: staticEntry.notes || "",
        inheritsFrom: null
      },
      requiredParameters,
      parameters: staticEntry.parameterGroups || {},
      specs: staticEntry.specs || {}
    },
    report: {
      relPath: staticEntry.localDoc || `(static ${channelId}/${protocolId})`,
      channelId,
      protocolId,
      specCount: Object.keys(staticEntry.specs || {}).length,
      groupCount: Object.values(staticEntry.parameterGroups || {}).flat().length,
      requiredCount: requiredParameters.length
    }
  };
}

function main() {
  const registry = loadJson(REGISTRY_PATH);
  const channels = {};
  const reports = [];

  for (const [relPath, manifest] of Object.entries(PROTOCOL_DOC_MANIFEST)) {
    const built = buildEntry(relPath, manifest, registry);
    if (!built) continue;
    channels[built.channelId] ||= {};
    channels[built.channelId][built.protocolId] = built.entry;
    reports.push(built.report);
  }

  for (const [channelId, protocols] of Object.entries(registry.staticEntries || {})) {
    for (const [protocolId, staticEntry] of Object.entries(protocols)) {
      if (channels[channelId]?.[protocolId]) continue;
      const built = buildStaticEntry(channelId, protocolId, staticEntry, registry);
      channels[built.channelId] ||= {};
      channels[built.channelId][built.protocolId] = built.entry;
      reports.push(built.report);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    evalChannels: registry.evalChannels,
    protocolDefaultRequired: registry.protocolDefaultRequired,
    protocolRequiredOverrides: registry.protocolRequiredOverrides,
    docStatus: registry.docStatus,
    openAiBaseline: registry.openAiBaseline,
    channels
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");

  console.log("build-protocol-matrix:");
  console.log(`  output → ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  channels → ${Object.keys(channels).length}`);
  for (const r of reports.sort((a, b) => a.relPath.localeCompare(b.relPath))) {
    console.log(`  · ${r.relPath}: ${r.specCount} specs, ${r.groupCount} grouped params, ${r.requiredCount} required`);
  }
}

main();
