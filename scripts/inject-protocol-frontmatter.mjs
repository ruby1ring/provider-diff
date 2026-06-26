#!/usr/bin/env node
/**
 * Inject YAML frontmatter into protocol docs from manifest.
 * Run: node scripts/inject-protocol-frontmatter.mjs
 */
import fs from "fs";
import path from "path";
import { PROTOCOL_DOC_MANIFEST } from "./protocol-doc-manifest.mjs";
import { parseFrontmatter, stringifyFrontmatter } from "./lib/md-parse.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function stripLegacyMeta(body) {
  return body
    .replace(/^> \*\*Last verified:\*\*.*\n/gm, "")
    .replace(/^> \*\*Official source:\*\*.*\n/gm, "")
    .replace(/^> \*\*Protocol ID:\*\*.*\n/gm, "")
    .replace(/^Structured summary for Noctua.*\n/gm, "")
    .replace(/^\n{3,}/gm, "\n\n")
    .trimStart();
}

function main() {
  let updated = 0;
  for (const [relPath, meta] of Object.entries(PROTOCOL_DOC_MANIFEST)) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) {
      console.warn(`skip missing ${relPath}`);
      continue;
    }
    const raw = fs.readFileSync(abs, "utf8");
    const { meta: existing, body } = parseFrontmatter(raw);
    if (existing.channel_id) {
      console.log(`skip (has frontmatter) ${relPath}`);
      continue;
    }

    const titleMatch = body.match(/^# .+\n+/);
    const title = titleMatch ? titleMatch[0] : "";
    const rest = stripLegacyMeta(body.slice(title.length));

    const frontmatter = stringifyFrontmatter({
      channel_id: meta.channel_id,
      protocol_id: meta.protocol_id,
      doc_status: meta.doc_status,
      doc_url: meta.doc_url || null,
      last_verified: meta.last_verified,
      compare: meta.compare !== false,
      required_parameters: meta.required_parameters,
      parameter_groups: meta.parameter_groups,
      notes: meta.notes
    });

    const out = `${frontmatter}${title}\n${rest}`.trimEnd() + "\n";
    fs.writeFileSync(abs, out);
    updated += 1;
    console.log(`injected ${relPath}`);
  }
  console.log(`inject-protocol-frontmatter: ${updated} files updated`);
}

main();
