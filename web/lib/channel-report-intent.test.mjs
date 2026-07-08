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

const observeAssertStats = api.channelReportStats([
  {
    case_id: "deepseek_length_max_completion_tokens_stop",
    source_case: { case_id: "deepseek_length_max_completion_tokens_stop", category: "length" },
    support_conclusion: "schema_mismatch",
    http_status: 200,
    assertions: [{ name: "finish_reason", pass: false, message: "unexpected" }]
  }
], {
  matchesExpectedResult: (result) => result.support_conclusion === "supported",
  expectedHTTPStatusForResult: () => 200
});
assert(observeAssertStats.observeAssertionFail === 1, "observe assertion fail counted");
assert(observeAssertStats.observeRecorded === 0, "observe assertion fail not counted as recorded");

assert(api.observeReportStatus({
  http_status: 200,
  assertions: [{ name: "finish_reason", pass: false }]
}) === "observe_assert_fail", "observe assert fail status");

assert(api.caseSeverityLevel({ case_id: "ali_basic_minimal" }, "connectivity") === "p0", "connectivity p0");
assert(api.caseSeverityLevel({ case_id: "ali_protocol_stream_basic", category: "protocol" }, "protocol") === "p0", "stream basic p0");
assert(api.caseSeverityLevel({ case_id: "ali_protocol_stream_usage_chunk_shape", category: "protocol" }, "protocol") === "p2", "usage chunk shape p2");
assert(api.caseSeverityLevel({ case_id: "ali_protocol_sampling_temperature_1", category: "protocol" }, "protocol_sampling") === "p3", "sampling p3");

const evaluation = api.channelReportEvaluationSummary([
  {
    case_id: "ali_basic_minimal",
    title: "基础连通",
    group_key: "connectivity",
    intent: "assert",
    by_channel: {
      baseline: { report_status: "pass", channel_name: "DeepSeek" },
      target_a: { report_status: "fail", channel_name: "阿里云新加坡" }
    }
  },
  {
    case_id: "ali_protocol_stream_usage_chunk_shape",
    title: "流式用量 chunk 结构",
    group_key: "protocol",
    intent: "observe",
    by_channel: {
      baseline: { report_status: "recorded", channel_name: "DeepSeek" },
      target_a: { report_status: "observe_issue", channel_name: "阿里云新加坡" }
    }
  }
], [
  { key: "baseline", platformName: "DeepSeek", role: "baseline" },
  { key: "target_a", platformName: "阿里云新加坡", role: "target" }
], { assertFail: 1, observeIssue: 1 });

assert(evaluation.verdict === "fail", "p0 failure should block verdict");
assert(evaluation.version === 2, "evaluation version 2");
assert(evaluation.failing_cases.length === 2, "two failing cases");
assert(evaluation.channel_summaries[0].platformName === "阿里云新加坡", "channel issue summary");

const multiChannelEvaluation = api.channelReportEvaluationSummary([
  {
    case_id: "ali_basic_minimal",
    title: "基础连通",
    group_key: "connectivity",
    intent: "assert",
    by_channel: {
      baseline: { report_status: "pass", channel_name: "DeepSeek" },
      target_a: { report_status: "fail", channel_name: "阿里云弗吉尼亚" },
      target_b: { report_status: "fail", channel_name: "阿里云新加坡" },
      target_c: { report_status: "pass", channel_name: "快手万擎" }
    }
  },
  {
    case_id: "ali_protocol_tool_choice_name",
    title: "tool_choice 指定函数名",
    group_key: "protocol_tools",
    intent: "assert",
    by_channel: {
      baseline: { report_status: "pass", channel_name: "DeepSeek" },
      target_a: { report_status: "fail", channel_name: "阿里云弗吉尼亚" },
      target_b: { report_status: "fail", channel_name: "阿里云新加坡" },
      target_c: { report_status: "fail", channel_name: "快手万擎" }
    }
  },
  {
    case_id: "ali_protocol_tool_choice_none",
    title: "tool_choice none",
    group_key: "protocol_tools",
    intent: "assert",
    by_channel: {
      baseline: { report_status: "pass", channel_name: "DeepSeek" },
      target_a: { report_status: "fail", channel_name: "阿里云弗吉尼亚" },
      target_b: { report_status: "fail", channel_name: "阿里云新加坡" },
      target_c: { report_status: "fail", channel_name: "快手万擎" }
    }
  }
], [
  { key: "baseline", platformName: "DeepSeek", role: "baseline" },
  { key: "target_a", platformName: "阿里云百炼（弗吉尼亚）", role: "target" },
  { key: "target_b", platformName: "阿里云百炼（新加坡）", role: "target" },
  { key: "target_c", platformName: "快手万擎（StreamLake）", role: "target" }
], { assertFail: 3 });

const rankings = multiChannelEvaluation.channel_rankings || [];
assert(rankings.length === 3, "three channel rankings");
assert(rankings[0].platformName === "快手万擎（StreamLake）", "fewest issues ranks first");
assert(rankings[0].issueCount === 2, "best channel has 2 issues");
assert(rankings[0].verdict === "fail", "p0 issues still fail verdict");
assert(rankings[0].verdict_meta.label === "不建议接入", "fail channel label");
assert(rankings[2].issueCount === 3, "worst channel has 3 issues");
assert(multiChannelEvaluation.ranking_comparison_text.includes("快手万擎"), "comparison mentions best channel");
assert(multiChannelEvaluation.ranking_comparison_text.includes("阿里云百炼（新加坡）"), "comparison mentions worst channel");

console.log("channel-report-intent.test.mjs: all passed");
