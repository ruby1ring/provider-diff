#!/usr/bin/env node
/**
 * Audit RUN_V02 case groups for completeness (undocumented scenarios, decidability, duplicates).
 *
 * 口径与运行时一致：先把 manifest.json 的 common_expect 合并进每个 case 的 expect
 * （后端 GET /api/providers/{id}/cases 的行为），再判定该 case 能否产出可判定结论：
 *   - judged        有 support_conclusion（内联或继承自 manifest）
 *   - observational 无 support_conclusion，但有观测型断言（thinking_required 等）
 *   - structural    仅 http_status / required_response_fields 等结构断言
 *   - empty         合并后仍无任何断言 —— 无效 case，须补断言或删除（规则 2.1）
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const GROUPS = [
  "connectivity",
  "protocol",
  "protocol_sampling",
  "protocol_thinking",
  "protocol_tools",
  "protocol_response_format",
  "output_length",
  "cache_hit"
];

const GROUP_HINTS = {
  protocol: ["silent_ignore", "silent_effective", "reject_on_pass"],
  protocol_sampling: ["silent_ignore", "silent_effective", "reject_on_pass"],
  protocol_thinking: ["silent_ignore", "silent_effective"],
  protocol_tools: ["silent_ignore", "silent_effective", "reject_on_pass"]
};

// 观测型断言键：出现任意一个即认为 case 可产出可判定结论（evaluation_intent=observe 同理）
const OBSERVATIONAL_KEYS = [
  "thinking_required",
  "thinking_location",
  "thinking_location_probe",
  "thinking_must_precede_text",
  "thinking_required_fields",
  "assistant_content_non_empty",
  "stream_usage_in_sse",
  "stream_usage_chunk_shape",
  "stream_probe_attempts",
  "allowed_finish_reasons",
  "effective_probe",
  "usage_required_fields",
  "content_required_fields",
  "choice_required_fields"
];

const STRUCTURAL_KEYS = ["http_status", "required_response_fields"];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function inferGroup(caseId = "", category = "") {
  const id = String(caseId).toLowerCase();
  const cat = String(category).toLowerCase();
  if (id.includes("basic_minimal") || cat === "connectivity") return "connectivity";
  if (cat === "cache" || id.includes("cache")) return "cache_hit";
  if (cat === "length" || id.includes("length")) return "output_length";
  if (cat === "tools" || id.includes("tools")) return "protocol_tools";
  if (cat === "reasoning" || id.includes("thinking") || id.includes("reasoning")) return "protocol_thinking";
  if (id.includes("response_format") || id.includes("output_response")) return "protocol_response_format";
  if (cat === "sampling" || id.includes("sampling")) return "protocol_sampling";
  if (cat === "protocol" || id.includes("stream") || id.includes("protocol")) return "protocol";
  return "protocol";
}

function resolveGroup(testCase) {
  return (
    testCase.target_group ||
    testCase.expect?.target_group ||
    inferGroup(testCase.case_id, testCase.category)
  );
}

// 从原始文本中截取 "payload": {...} 块（保留 1 与 1.0 的字面差异，避免把
// integer/float 序列化差异 case 误判为重复）
function extractPayloadText(raw) {
  const idx = raw.indexOf('"payload"');
  if (idx === -1) return null;
  const start = raw.indexOf("{", idx);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1).replace(/\s+/g, "");
    }
  }
  return null;
}

function classifyExpect(mergedExpect) {
  const expect = mergedExpect || {};
  if (expect.support_conclusion) return "judged";
  if (expect.evaluation_intent === "observe") return "observational";
  if (OBSERVATIONAL_KEYS.some((key) => expect[key] !== undefined)) return "observational";
  if (STRUCTURAL_KEYS.some((key) => expect[key] !== undefined)) return "structural";
  return "empty";
}

function walkPayloadFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPayloadFiles(full, files);
    else if (entry.name.endsWith(".json") && entry.name !== "manifest.json") files.push(full);
  }
  return files;
}

function main() {
  const payloadRoot = path.join(ROOT, "payloads");
  const providers = fs.readdirSync(payloadRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const byGroup = Object.fromEntries(GROUPS.map((g) => [g, []]));
  const missingConclusion = [];
  const emptyExpect = [];
  const undocumentedCases = [];
  const duplicateCandidates = [];
  const counts = { judged: 0, observational: 0, structural: 0, empty: 0 };

  for (const provider of providers) {
    const providerDir = path.join(payloadRoot, provider);
    let commonExpect = {};
    const manifestPath = path.join(providerDir, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      try {
        commonExpect = loadJson(manifestPath).common_expect || {};
      } catch {
        commonExpect = {};
      }
    }

    const seenPayloads = new Map();
    for (const filePath of walkPayloadFiles(providerDir)) {
      let raw = "";
      let testCase = null;
      try {
        raw = fs.readFileSync(filePath, "utf8");
        testCase = JSON.parse(raw);
      } catch {
        continue; // skip invalid
      }
      if (!testCase?.case_id) continue;

      const relPath = path.relative(ROOT, filePath);
      const mergedExpect = { ...commonExpect, ...(testCase.expect || {}) };
      const group = resolveGroup(testCase);
      if (!byGroup[group]) byGroup[group] = [];
      byGroup[group].push({ provider, case_id: testCase.case_id, title: testCase.title });

      const decidability = classifyExpect(mergedExpect);
      counts[decidability] += 1;
      if (decidability === "empty") {
        emptyExpect.push({ provider, case_id: testCase.case_id, file: relPath });
      }
      if (!mergedExpect.support_conclusion && decidability !== "observational") {
        missingConclusion.push({ provider, case_id: testCase.case_id, file: relPath, decidability });
      }

      if (mergedExpect.doc_support === "undocumented" || mergedExpect.undocumented_scenario) {
        undocumentedCases.push({
          provider,
          case_id: testCase.case_id,
          group,
          scenario: mergedExpect.undocumented_scenario || "unspecified"
        });
      }

      const payloadText = extractPayloadText(raw);
      if (payloadText) {
        const prior = seenPayloads.get(payloadText);
        if (prior) {
          duplicateCandidates.push({
            provider,
            case_ids: [prior.case_id, testCase.case_id],
            files: [prior.file, relPath],
            note: "payload 原文完全一致；若 expect 意图也一致则应合并（规则 2.1）"
          });
        } else {
          seenPayloads.set(payloadText, { case_id: testCase.case_id, file: relPath });
        }
      }
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    groups: GROUPS.map((group) => ({
      group,
      case_count: (byGroup[group] || []).length,
      undocumented_scenarios_present: GROUP_HINTS[group]
        ? GROUP_HINTS[group].filter((scenario) =>
          undocumentedCases.some((item) => item.scenario === scenario && item.group === group)
        )
        : [],
      undocumented_scenarios_expected: GROUP_HINTS[group] || []
    })),
    decidability_counts: counts,
    empty_expect: emptyExpect,
    missing_support_conclusion_count: missingConclusion.length,
    missing_support_conclusion: missingConclusion,
    undocumented_case_count: undocumentedCases.length,
    undocumented_cases: undocumentedCases,
    duplicate_candidates: duplicateCandidates,
    notes: [
      "cache_hit 组的实跑 case 由前端 cacheCasesForRunV02() 动态合成，本审计只统计静态 payload 文件，两者口径不同。",
      "missing_support_conclusion 已合并 manifest.common_expect（与后端加载口径一致），观测型 case 不计入。"
    ]
  };

  const outPath = path.join(ROOT, "outputs/case-coverage-audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log("[audit-case-coverage] group counts:");
  for (const entry of report.groups) {
    const scenarios = entry.undocumented_scenarios_expected.length
      ? ` | 三类边界: ${entry.undocumented_scenarios_present.length}/${entry.undocumented_scenarios_expected.length} (${entry.undocumented_scenarios_present.join(", ") || "无"})`
      : "";
    console.log(`  ${entry.group}: ${entry.case_count} cases${scenarios}`);
  }
  console.log(`  可判定性: judged=${counts.judged} observational=${counts.observational} structural=${counts.structural} empty=${counts.empty}`);
  console.log(`  缺 support_conclusion（含结构断言型）: ${missingConclusion.length}`);
  console.log(`  无效（空断言）case: ${emptyExpect.length}`);
  console.log(`  隐性参数 case: ${undocumentedCases.length}`);
  console.log(`  同目录重复 payload 候选: ${duplicateCandidates.length}`);
  console.log(`→ ${path.relative(ROOT, outPath)}`);
}

main();
