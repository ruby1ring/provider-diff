#!/usr/bin/env node
/**
 * Audit RUN_V02 case groups for completeness hints (undocumented scenarios, missing expect).
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
  protocol_sampling: ["silent_ignore", "silent_effective", "reject_on_pass"],
  protocol_thinking: ["silent_ignore", "silent_effective"],
  protocol_tools: ["silent_ignore", "silent_effective", "reject_on_pass"]
};

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
  if (cat === "protocol" || id.includes("stream") || id.includes("protocol")) return "protocol";
  if (cat === "sampling" || id.includes("sampling")) return "protocol_sampling";
  return "protocol";
}

function walkPayloads(dir, cases = []) {
  if (!fs.existsSync(dir)) return cases;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPayloads(full, cases);
    else if (entry.name.endsWith(".json") && entry.name !== "manifest.json") {
      try {
        cases.push(loadJson(full));
      } catch {
        // skip invalid
      }
    }
  }
  return cases;
}

function main() {
  const payloadRoot = path.join(ROOT, "payloads");
  const providers = fs.readdirSync(payloadRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const byGroup = Object.fromEntries(GROUPS.map((g) => [g, []]));
  const missingExpect = [];
  const undocumentedCases = [];

  for (const provider of providers) {
    const cases = walkPayloads(path.join(payloadRoot, provider));
    for (const testCase of cases) {
      if (!testCase?.case_id) continue;
      const group = testCase.target_group || testCase.expect?.target_group || inferGroup(testCase.case_id, testCase.category);
      if (!byGroup[group]) byGroup[group] = [];
      byGroup[group].push({ provider, case_id: testCase.case_id, title: testCase.title });

      if (!testCase.expect?.support_conclusion) {
        missingExpect.push({ provider, case_id: testCase.case_id });
      }
      if (testCase.expect?.doc_support === "undocumented" || testCase.expect?.undocumented_scenario) {
        undocumentedCases.push({
          provider,
          case_id: testCase.case_id,
          scenario: testCase.expect?.undocumented_scenario || "unspecified"
        });
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
          undocumentedCases.some((item) => item.scenario === scenario && inferGroup(item.case_id) === group)
        )
        : [],
      undocumented_scenarios_expected: GROUP_HINTS[group] || []
    })),
    missing_expect_count: missingExpect.length,
    missing_expect_sample: missingExpect.slice(0, 20),
    undocumented_case_count: undocumentedCases.length
  };

  const outPath = path.join(ROOT, "outputs/case-coverage-audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log("[audit-case-coverage] group counts:");
  for (const entry of report.groups) {
    console.log(`  ${entry.group}: ${entry.case_count} cases`);
  }
  console.log(`  missing expect: ${report.missing_expect_count}`);
  console.log(`  undocumented tagged: ${report.undocumented_case_count}`);
  console.log(`→ ${path.relative(ROOT, outPath)}`);
}

main();
