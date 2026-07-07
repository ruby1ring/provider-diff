import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libPath = path.join(__dirname, "channel-report-intent.js");
const code = await import("node:fs/promises").then((fs) => fs.readFile(libPath, "utf8"));

const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const api = sandbox.window.NOCTUA_CHANNEL_REPORT_INTENT;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(api.caseEvaluationIntent({ case_id: "ali_basic_minimal" }, "connectivity") === "assert", "connectivity assert");
assert(api.caseEvaluationIntent({ case_id: "ali_protocol_sampling_temperature_1", category: "protocol" }, "protocol_sampling") === "observe", "sampling observe");
assert(api.caseEvaluationIntent({ case_id: "thinking_enable_thinking_true", category: "reasoning", expect: { thinking_location_probe: true } }, "protocol_thinking") === "observe", "thinking observe");
assert(api.caseEvaluationIntent({ case_id: "tools_auto" }, "protocol_tools") === "assert", "tools assert");
assert(api.caseEvaluationIntent({ case_id: "cache_passive_long_prompt", category: "cache", cache_case: true }, "cache_hit") === "observe", "cache passive observe");
assert(api.caseEvaluationIntent({ case_id: "cache_passive_hit_rate_85", category: "cache", cache_case: true, min_hit_rate: 0.85 }, "cache_hit") === "assert", "cache 85 assert");
assert(api.caseEvaluationIntent({ case_id: "ali_protocol_stream_usage_without_include_usage", category: "protocol" }, "protocol") === "observe", "stream usage observe");
assert(api.caseEvaluationIntent({ case_id: "ali_protocol_stream_basic", category: "protocol" }, "protocol") === "assert", "stream basic assert");
assert(api.caseEvaluationIntent({ optional: true, case_id: "x" }, "protocol_tools") === "observe", "optional override");

const stats = api.channelReportStats([
  { case_id: "ali_basic_minimal", source_case: { case_id: "ali_basic_minimal" }, support_conclusion: "supported", http_status: 200, is_baseline: true },
  { case_id: "ali_basic_minimal", source_case: { case_id: "ali_basic_minimal" }, support_conclusion: "rejected_400", http_status: 400, is_baseline: false, diff_count: 0 },
  { case_id: "thinking_enable_thinking_true", source_case: { case_id: "thinking_enable_thinking_true", category: "reasoning", expect: { thinking_location_probe: true } }, support_conclusion: "ignored", http_status: 200, is_baseline: false }
], {
  matchesExpectedResult: (result) => result.support_conclusion === "supported",
  expectedHTTPStatusForResult: () => 200
});

assert(stats.assertFail === 1, "assert fail counted");
assert(stats.observeRecorded === 1, "observe recorded when http ok");
assert(stats.assertPass === 1, "assert pass for baseline");

console.log("channel-report-intent.test.mjs: all passed");
