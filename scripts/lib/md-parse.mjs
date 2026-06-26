import fs from "fs";

export function readFile(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

export function writeFile(path, content) {
  fs.mkdirSync(path.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  fs.writeFileSync(path, content.trimEnd() + "\n");
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: text };
  const yaml = match[1];
  const meta = parseSimpleYaml(yaml);
  if (!meta.parameter_groups) meta.parameter_groups = parseParameterGroups(yaml);
  if (!meta.required_parameters && /required_parameters:/.test(yaml)) {
    meta.required_parameters = parseInlineList(
      yaml.match(/required_parameters:\s*\[([^\]]*)\]/)?.[1] || ""
    );
  }
  if (meta.compare === undefined && /compare:\s*false/.test(yaml)) meta.compare = false;
  return { meta, body: text.slice(match[0].length) };
}

function parseParameterGroups(yaml) {
  const groups = {};
  const block = yaml.match(/parameter_groups:\n([\s\S]*?)(?:\n[A-Za-z_]+:|$)/);
  if (!block) return groups;
  for (const line of block[1].split("\n")) {
    const m = line.match(/^\s{2}([^:]+):\s*\[(.*)\]\s*$/);
    if (m) groups[m[1].trim()] = parseInlineList(m[2]);
  }
  return groups;
}

function parseSimpleYaml(yaml) {
  const result = {};
  let currentKey = null;
  let currentIndent = 0;
  let groupObj = null;

  for (const rawLine of yaml.split("\n")) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;

    const indent = rawLine.match(/^(\s*)/)[1].length;
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") && currentKey && Array.isArray(result[currentKey])) {
      result[currentKey].push(parseScalar(trimmed.slice(2)));
      continue;
    }

    const kv = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!kv) continue;

    const [, key, rawValue] = kv;
    if (!rawValue) {
      if (indent > 0 && groupObj && currentKey) {
        const subKey = key;
        if (!groupObj[subKey]) groupObj[subKey] = [];
        currentKey = `${currentKey}::${subKey}`;
        continue;
      }
      currentKey = key;
      currentIndent = indent;
      if (key === "parameter_groups" || key === "mappings") {
        result[key] = {};
        groupObj = result[key];
      } else {
        result[key] = [];
        groupObj = null;
      }
      continue;
    }

    const value = parseScalar(rawValue);
    if (indent > 0 && groupObj && currentKey === "parameter_groups") {
      const groupName = key;
      groupObj[groupName] = Array.isArray(value) ? value : parseInlineList(rawValue);
    } else if (indent > 0 && groupObj && currentKey === "mappings") {
      groupObj[key] = typeof value === "object" ? value : parseScalar(rawValue);
    } else {
      result[key] = value;
      currentKey = key;
      groupObj = null;
    }
  }

  return normalizeYamlCollections(result, yaml);
}

function normalizeYamlCollections(result, yaml) {
  const out = { ...result };

  if (yaml.includes("parameter_groups:")) {
    out.parameter_groups = out.parameter_groups || {};
    const block = yaml.split("parameter_groups:")[1]?.split(/^notes:/m)[0] || "";
    for (const line of block.split("\n")) {
      const m = line.match(/^\s{2}([A-Za-z0-9_]+):\s*\[(.*)\]\s*$/);
      if (m) out.parameter_groups[m[1]] = parseInlineList(m[2]);
      const m2 = line.match(/^\s{2}([A-Za-z0-9_]+):\s*$/);
      if (m2 && !out.parameter_groups[m2[1]]) out.parameter_groups[m2[1]] = [];
    }
  }

  for (const key of ["required_parameters", "compare", "doc_url", "doc_status"]) {
    if (out[key] === undefined) continue;
  }

  if (typeof out.required_parameters === "string") {
    out.required_parameters = parseInlineList(out.required_parameters.replace(/^\[|\]$/g, ""));
  }
  if (typeof out.compare === "string") {
    out.compare = out.compare === "true";
  }

  return out;
}

function parseInlineList(text) {
  if (!text || text === "—" || text === "-") return [];
  return text
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return parseInlineList(trimmed.slice(1, -1));
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function stringifyFrontmatter(meta) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (key === "parameter_groups" && value && typeof value === "object") {
      lines.push("parameter_groups:");
      for (const [group, params] of Object.entries(value)) {
        lines.push(`  ${group}: [${params.join(", ")}]`);
      }
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) lines.push(`${key}: []`);
      else if (typeof value[0] === "string") lines.push(`${key}: [${value.join(", ")}]`);
      else lines.push(`${key}:`);
      continue;
    }
    if (typeof value === "string" && (value.includes(":") || value.includes("#"))) {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else if (typeof value === "string") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

export function parseMarkdownTables(body) {
  const tables = [];
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      i += 1;
      continue;
    }
    const header = splitTableRow(line);
    i += 1;
    if (i >= lines.length || !/^[\s|:-]+$/.test(lines[i])) {
      i += 1;
      continue;
    }
    i += 1;
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      rows.push(splitTableRow(lines[i]));
      i += 1;
    }
    tables.push({ header, rows });
  }
  return tables;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function findSectionTables(body, sectionPattern) {
  const parts = body.split(/^## /m);
  for (const part of parts) {
    if (!sectionPattern.test(part)) continue;
    const sectionBody = part.replace(/^[^\n]*\n/, "");
    return parseMarkdownTables(sectionBody);
  }
  return [];
}

export function normalizeParameterName(cell) {
  return cell.replace(/^`+|`+$/g, "").trim();
}

/**
 * Preserve the channel's official API type string verbatim.
 * Only normalizes markdown escaping and splits nullable unions (`T | null`).
 */
export function normalizeType(cell) {
  if (!cell || cell === "—" || cell === "-") return null;
  const raw = cell.replace(/^`+|`+$/g, "").trim().replace(/\\\|/g, "|");
  if (/^deprecated$/i.test(raw)) return "deprecated";

  const parts = raw
    .split(/\s*\|\s*/)
    .map((part) => part.trim().replace(/\\$/, ""))
    .filter((part) => part && part.toLowerCase() !== "null");

  return parts.join(" | ") || null;
}

function deprecatedBaseType(parameter) {
  if (/penalty|top_p|temperature|repetition|min_p|top_a|logit/.test(parameter)) return "number";
  if (/max_tokens|top_logprobs|top_k|seed|^n$|completion_tokens|output_tokens/.test(parameter)) return "integer";
  return "string";
}

export function parseRange(cell) {
  if (!cell || cell === "—" || cell === "-") return null;
  const text = cell.trim();

  let m = text.match(/^\[([-\d.]+)\s*,\s*([-\d.]+)\)$/);
  if (m) return { min: num(m[1]), max: num(m[2]), minInclusive: true, maxInclusive: false };

  m = text.match(/^\[([-\d.]+)\s*,\s*([-\d.]+)\]$/);
  if (m) return { min: num(m[1]), max: num(m[2]), minInclusive: true, maxInclusive: true };

  m = text.match(/^\(([-\d.]+)\s*,\s*([-\d.]+)\]$/);
  if (m) return { min: num(m[1]), max: num(m[2]), minInclusive: false, maxInclusive: true };

  m = text.match(/^([-\d.]+)\s*[–—-]\s*([-\d.]+)$/);
  if (m) return { min: num(m[1]), max: num(m[2]), minInclusive: true, maxInclusive: true };

  m = text.match(/^min\s+([-\d.]+)\s*,\s*max\s+([-\d.]+)$/i);
  if (m) return { min: num(m[1]), max: num(m[2]), minInclusive: true, maxInclusive: true };

  m = text.match(/^≤\s*([-\d.]+)$/);
  if (m) return { min: null, max: num(m[1]), minInclusive: true, maxInclusive: true };

  m = text.match(/^≥\s*([-\d.]+)$/);
  if (m) return { min: num(m[1]), max: null, minInclusive: true, maxInclusive: true };

  m = text.match(/^max\s+([-\d.]+)$/i);
  if (m) return { min: null, max: num(m[1]), minInclusive: true, maxInclusive: true };

  return null;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function parseEffective(notes, typeCell) {
  const text = `${notes || ""} ${typeCell || ""}`.toLowerCase();
  if (/deprecated|即将废弃|已弃用/.test(text)) return "deprecated";
  if (/ignored|无效果|接受但无/.test(text)) return "ignored";
  return null;
}

export function rowToSpec(row, header) {
  const idx = Object.fromEntries(header.map((h, i) => [normalizeHeader(h), i]));
  const parameter = normalizeParameterName(row[idx.parameter] || row[idx.field] || "");
  if (!parameter) return null;

  const typeCell = row[idx.type] || row[idx["type / range"]] || "";
  const notes = row[idx.notes] || row[idx["default / notes"]] || "";
  const required = (row[idx.required] || row[idx.support] || "").toLowerCase();
  const defaultCell = row[idx.default] || "";
  const rangeCell = row[idx.range] || "";

  let type = normalizeType(typeCell);
  const spec = { type: type || "string" };
  if (type === "deprecated") {
    spec.type = deprecatedBaseType(parameter);
    spec.effective = "deprecated";
  }
  if (/null/i.test(typeCell)) spec.nullable = true;

  const def = parseDefault(defaultCell);
  if (def !== null && def !== undefined) spec.default = def;

  const range = parseRange(rangeCell) || parseRange(typeCell) || parseRange(notes);
  if (range) spec.range = range;

  const effective = parseEffective(notes, typeCell);
  if (effective) spec.effective = effective;

  if (notes && notes !== "—") spec.notes = notes.replace(/\*\*/g, "").trim();

  return { parameter, spec, required };
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseDefault(cell) {
  if (!cell || cell === "—" || cell === "-" || cell === "model-dependent") return null;
  const raw = cell.replace(/^`+|`+$/g, "").trim();
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw.startsWith("{") || raw.startsWith("[")) return raw;
  return raw;
}

export function collectSpecsFromBody(body) {
  const specs = {};
  const tables = parseMarkdownTables(body);
  for (const table of tables) {
    const header = table.header.map((h) => h.toLowerCase());
    const isParamTable = header.some((h) => h.includes("parameter") || h.includes("field"));
    const hasTypeColumn = header.some((h) => h === "type" || h.startsWith("type /") || h.includes("type / range"));
    if (!isParamTable || !hasTypeColumn) continue;
    for (const row of table.rows) {
      const parsed = rowToSpec(row, table.header);
      if (!parsed) continue;
      specs[parsed.parameter] = parsed.spec;
    }
  }
  return specs;
}

export function newestMtime(paths) {
  let max = 0;
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const stat = fs.statSync(p);
    max = Math.max(max, stat.mtimeMs);
  }
  return max;
}
