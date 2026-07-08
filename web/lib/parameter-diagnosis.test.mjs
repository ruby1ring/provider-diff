import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libPath = path.join(__dirname, "parameter-diagnosis.js");
const code = await import("node:fs/promises").then((fs) => fs.readFile(libPath, "utf8"));

const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const api = sandbox.window.NOCTUA_PARAMETER_DIAGNOSIS;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const docGap = api.diagnoseParameterSupport({
  case_id: "minimax_unknown_seed_probe",
  http_status: 200,
  support_conclusion: "schema_mismatch",
  parameters: ["seed"],
  source_case: {
    expect: {
      doc_support: "undocumented",
      undocumented_scenario: "silent_ignore",
      support_conclusion: "ignored"
    }
  },
  assertions: [
    { name: "thinking_absent", pass: false, message: "出现 reasoning_content" }
  ]
});
assert(docGap.flag === "doc_gap", "undocumented effective should be doc_gap");

const rejected = api.diagnoseParameterSupport({
  case_id: "probe_unknown_param",
  http_status: 400,
  support_conclusion: "rejected_400",
  source_case: {
    expect: {
      doc_support: "undocumented",
      undocumented_scenario: "silent_ignore"
    }
  }
});
assert(rejected.flag === "undocumented_rejected", "undocumented 4xx on ignore scenario");

const silentIgnore = api.diagnoseParameterSupport({
  case_id: "probe_unknown_param",
  http_status: 200,
  support_conclusion: "ignored",
  source_case: {
    expect: {
      doc_support: "undocumented",
      undocumented_scenario: "silent_ignore"
    }
  },
  assertions: [{ name: "http_status", pass: true }]
});
assert(silentIgnore.compliant === true, "silent ignore compliant");
assert(!silentIgnore.flag, "silent ignore no flag");

const documentedFail = api.diagnoseParameterSupport({
  case_id: "ali_tools_choice_none",
  http_status: 200,
  support_conclusion: "schema_mismatch",
  expected_support_conclusion: "supported",
  source_case: { expect: { doc_support: "documented", support_conclusion: "supported" } },
  assertions: [{ name: "tool_calls", pass: false }]
});
assert(documentedFail.compliant === false, "documented strict mismatch");

const scanned = api.scanResultsForDocIssues([
  { case_id: "a", parameter_diagnosis: { flag: "doc_gap", message: "x" } },
  { case_id: "b", http_status: 200, source_case: { expect: { doc_support: "undocumented" } }, assertions: [{ name: "thinking_absent", pass: false }] }
]);
assert(scanned.length === 2, "scan finds flagged results");

console.log("parameter-diagnosis.test.mjs: all passed");
