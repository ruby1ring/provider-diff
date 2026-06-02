const fs = require("fs");
const path = require("path");

const providerNames = {
  deepseek: "DeepSeek",
  minimax: "MiniMax",
  siliconflow: "SiliconFlow",
  ali: "Aliyun Bailian",
  openrouter: "OpenRouter",
  openai: "OpenAI Official"
};

const endpointNames = {
  chat_completions: "Chat Completions",
  anthropic_messages: "Anthropic Messages"
};

const defaultBaseUrls = {
  deepseek: {
    chat_completions: "https://api.deepseek.com",
    anthropic_messages: "https://api.deepseek.com/anthropic/v1"
  },
  minimax: {
    chat_completions: "https://api.minimaxi.com/v1",
    anthropic_messages: "https://api.minimaxi.com/anthropic/v1"
  },
  siliconflow: {
    chat_completions: "https://api.siliconflow.cn/v1",
    anthropic_messages: "https://api.siliconflow.cn/v1"
  },
  ali: {
    chat_completions: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    anthropic_messages: "https://dashscope.aliyuncs.com/apps/anthropic/v1"
  }
};

const defaultModels = {
  deepseek: "deepseek-v4-flash",
  minimax: "MiniMax-M2.7",
  siliconflow: "Pro/zai-org/GLM-4.7",
  ali: "qwen-plus"
};

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function hasResponseBody(result) {
  return Object.prototype.hasOwnProperty.call(result || {}, "response_body") && result.response_body !== undefined && result.response_body !== null;
}

function statusCounts(results) {
  return {
    total: results.length,
    supported: results.filter((item) => item.support_conclusion === "supported").length,
    ignored: results.filter((item) => item.support_conclusion === "ignored").length,
    permissionLimited: results.filter((item) => item.support_conclusion === "permission_limited").length,
    rejected: results.filter((item) => item.support_conclusion === "rejected_400").length,
    requestFailed: results.filter((item) => item.support_conclusion === "request_failed").length,
    schemaMismatch: results.filter((item) => item.support_conclusion === "schema_mismatch").length,
    diffs: results.filter((item) => item.diff_count > 0).length,
    baselineReady: results.filter(hasResponseBody).length
  };
}

function normalizeResult(result) {
  return {
    case_id: result.case_id,
    title: result.title || "",
    category: result.category || "case",
    parameters: result.parameters || [],
    parameter: Array.isArray(result.parameters) && result.parameters.length ? result.parameters.join(" + ") : "payload",
    support_conclusion: result.support_conclusion || result.conclusion || "unknown",
    http_status: result.http_status || result.status || 0,
    latency_ms: result.latency_ms || result.elapsed_ms || 0,
    diff_count: Number(result.diff_count || 0),
    message: result.message || result.error || "",
    request_headers: result.request_headers || null,
    request_body: result.request_body || null,
    response_body: hasResponseBody(result) ? result.response_body : null,
    raw_response: result.raw_response || "",
    response_headers: result.response_headers || null,
    assertions: result.assertions || [],
    failed_assertions: result.failed_assertions || result.failed || [],
    expected_http_status: result.expected_http_status || 0,
    expected_support_conclusion: result.expected_support_conclusion || "",
    error: result.error || ""
  };
}

function normalizeSuite(suite, sourceFile, generatedAt) {
  const provider = suite.provider || "unknown";
  const endpointId = suite.endpoint_id || "chat_completions";
  const results = (suite.results || []).map(normalizeResult);
  return {
    id: `report_import_${provider}_${endpointId}_${Date.parse(generatedAt) || Date.now()}`,
    generated_at: generatedAt,
    imported_from: sourceFile,
    endpoint_id: endpointId,
    endpoint_label: endpointNames[endpointId] || endpointId,
    channel_id: provider === "ali" ? "aliyun" : provider,
    channel_name: providerNames[provider] || provider,
    provider,
    base_url: suite.base_url || defaultBaseUrls[provider]?.[endpointId] || "",
    model: suite.model || defaultModels[provider] || "",
    baseline_report_id: "",
    baseline_label: "",
    proxy: { enabled: false, url: "", mode: "direct" },
    stats: statusCounts(results),
    results
  };
}

function suitesFromInput(input, file) {
  if (Array.isArray(input.suites)) {
    const generatedAt = input.finished_at || input.updated_at || input.started_at || new Date().toISOString();
    return input.suites.map((suite) => normalizeSuite(suite, file, generatedAt));
  }
  if (Array.isArray(input.results)) {
    const generatedAt = input.finished_at || input.generated_at || input.started_at || new Date().toISOString();
    return [normalizeSuite(input, file, generatedAt)];
  }
  if (Array.isArray(input)) {
    const provider = path.basename(file).match(/provider-diff-([^-]+)/)?.[1] || "unknown";
    return [normalizeSuite({ provider, results: input }, file, new Date().toISOString())];
  }
  return [];
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node scripts/build-history-import.js <output.json> <input.json> [input2.json...]");
    process.exit(2);
  }
  const [output, ...inputs] = args;
  const records = inputs.flatMap((file) => suitesFromInput(readJSON(file), file))
    .filter((record) => record.results.length);
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ generated_at: new Date().toISOString(), records }, null, 2));
  const baselineReady = records.filter((record) => record.stats.baselineReady > 0).length;
  console.log(`wrote ${records.length} records (${baselineReady} baseline-ready) to ${output}`);
}

main();
