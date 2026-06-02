const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiBase = process.env.API_BASE || "http://127.0.0.1:8080";

const providers = [
  {
    provider: "openai",
    channel_id: "openai",
    channel_name: "OpenAI Official",
    endpoints: [
      { endpoint_id: "chat_completions", base_url: "https://api.openai.com/v1" }
    ]
  },
  {
    provider: "deepseek",
    channel_id: "deepseek",
    channel_name: "DeepSeek",
    endpoints: [
      { endpoint_id: "chat_completions", base_url: "https://api.deepseek.com" },
      { endpoint_id: "anthropic_messages", base_url: "https://api.deepseek.com/anthropic/v1" }
    ]
  },
  {
    provider: "minimax",
    channel_id: "minimax",
    channel_name: "MiniMax",
    endpoints: [
      { endpoint_id: "chat_completions", base_url: "https://api.minimaxi.com/v1" },
      { endpoint_id: "anthropic_messages", base_url: "https://api.minimaxi.com/anthropic/v1" }
    ]
  },
  {
    provider: "siliconflow",
    channel_id: "siliconflow",
    channel_name: "SiliconFlow",
    endpoints: [
      { endpoint_id: "chat_completions", base_url: "https://api.siliconflow.cn/v1" },
      { endpoint_id: "anthropic_messages", base_url: "https://api.siliconflow.cn/v1" }
    ]
  },
  {
    provider: "openrouter",
    channel_id: "openrouter",
    channel_name: "OpenRouter",
    endpoints: [
      { endpoint_id: "chat_completions", base_url: "https://openrouter.ai/api/v1" },
      { endpoint_id: "anthropic_messages", base_url: "https://openrouter.ai/api/v1" }
    ]
  },
  {
    provider: "ali",
    channel_id: "aliyun",
    channel_name: "Aliyun Bailian",
    endpoints: [
      { endpoint_id: "chat_completions", base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
      { endpoint_id: "anthropic_messages", base_url: "https://dashscope.aliyuncs.com/apps/anthropic/v1" }
    ]
  }
];

const endpointLabels = {
  chat_completions: "Chat Completions",
  anthropic_messages: "Anthropic Messages"
};

function readConfig() {
  const text = fs.readFileSync(path.join(root, "config.yaml"), "utf8");
  const config = {};
  let current = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const section = line.match(/^([A-Za-z0-9_-]+):$/);
    if (section) {
      current = section[1];
      config[current] = {};
      continue;
    }
    if (!current) continue;
    if (/^https?:\/\//.test(line)) {
      config[current].base_url = line;
    } else if (!config[current].api_key) {
      config[current].api_key = line;
    }
  }
  return config;
}

function hasResponseBody(result) {
  return Object.prototype.hasOwnProperty.call(result || {}, "response_body") && result.response_body !== undefined && result.response_body !== null;
}

function expectedSupportConclusion(result) {
  if (result.expected_support_conclusion) return result.expected_support_conclusion;
  if (Number(result.expected_http_status || 0) >= 400) return "rejected_400";
  return "supported";
}

function matchesExpected(result) {
  const expected = expectedSupportConclusion(result);
  const expectedStatus = Number(result.expected_http_status || 0);
  const statusMatches = !expectedStatus || Number(result.http_status || 0) === expectedStatus;
  const conclusionMatches = (result.support_conclusion || "unknown") === expected;
  if (!statusMatches || !conclusionMatches) return false;
  if (expected === "rejected_400" || expected === "permission_limited") return true;
  return !(result.assertions || []).some((assertion) => assertion && assertion.pass === false);
}

function stats(results) {
  const expectedResults = results.filter(matchesExpected);
  const unexpectedResults = results.filter((item) => !matchesExpected(item));
  return {
    total: results.length,
    expectedPass: expectedResults.length,
    unexpected: unexpectedResults.length,
    unexpectedRejected: unexpectedResults.filter((item) => item.support_conclusion === "rejected_400").length,
    unexpectedRequestFailed: unexpectedResults.filter((item) => item.support_conclusion === "request_failed").length,
    unexpectedSchemaMismatch: unexpectedResults.filter((item) => item.support_conclusion === "schema_mismatch").length,
    supported: results.filter((item) => item.support_conclusion === "supported").length,
    ignored: results.filter((item) => item.support_conclusion === "ignored").length,
    permissionLimited: results.filter((item) => item.support_conclusion === "permission_limited").length,
    rejected: results.filter((item) => item.support_conclusion === "rejected_400").length,
    requestFailed: results.filter((item) => item.support_conclusion === "request_failed").length,
    schemaMismatch: results.filter((item) => item.support_conclusion === "schema_mismatch").length,
    diffs: 0,
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
    support_conclusion: result.support_conclusion || "unknown",
    http_status: result.http_status || 0,
    latency_ms: result.latency_ms || 0,
    diff_count: 0,
    message: result.error || "",
    request_headers: result.request_headers || null,
    request_body: result.request_body || null,
    response_body: hasResponseBody(result) ? result.response_body : null,
    raw_response: result.raw_response || "",
    response_headers: result.response_headers || null,
    assertions: result.assertions || [],
    expected_http_status: result.expected_http_status || 0,
    expected_support_conclusion: result.expected_support_conclusion || "",
    error: result.error || ""
  };
}

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function loadCases(provider, endpointId) {
  const data = await fetchJSON(`${apiBase}/api/providers/${provider}/cases?endpoint_id=${encodeURIComponent(endpointId)}`);
  return data.cases || [];
}

async function runCase(provider, endpoint, apiKey, model, caseId) {
  const data = await fetchJSON(`${apiBase}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      endpoint_id: endpoint.endpoint_id,
      case_ids: [caseId],
      custom_cases: [],
      api_key: apiKey,
      base_url: endpoint.base_url,
      model,
      proxy: { enabled: false, url: "", mode: "direct" }
    })
  });
  return data.results?.[0] || null;
}

async function runSuite(config, providerConfig, endpoint) {
  const auth = config[providerConfig.provider];
  if (!auth?.api_key) {
    console.log(`${providerConfig.provider}/${endpoint.endpoint_id}: skipped, missing key`);
    return null;
  }
  const cases = await loadCases(providerConfig.provider, endpoint.endpoint_id);
  const results = [];
  console.log(`${providerConfig.provider}/${endpoint.endpoint_id}: ${cases.length} cases`);
  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index];
    const result = await runCase(providerConfig.provider, endpoint, auth.api_key, "", testCase.case_id);
    if (result) results.push(normalizeResult(result));
    console.log(`${providerConfig.provider}/${endpoint.endpoint_id}: ${index + 1}/${cases.length} ${testCase.case_id} ${result?.support_conclusion || "missing"} HTTP ${result?.http_status || 0}`);
  }
  const generatedAt = new Date().toISOString();
  return {
    id: `report_original_${providerConfig.provider}_${endpoint.endpoint_id}_${Date.now()}`,
    generated_at: generatedAt,
    endpoint_id: endpoint.endpoint_id,
    endpoint_label: endpointLabels[endpoint.endpoint_id] || endpoint.endpoint_id,
    channel_id: providerConfig.channel_id,
    channel_name: providerConfig.channel_name,
    provider: providerConfig.provider,
    base_url: endpoint.base_url,
    model: results.find((item) => item.request_body?.model)?.request_body?.model || "",
    baseline_report_id: "",
    baseline_label: "",
    proxy: { enabled: false, url: "", mode: "direct" },
    stats: stats(results),
    results
  };
}

async function main() {
  const config = readConfig();
  const records = [];
  for (const providerConfig of providers) {
    for (const endpoint of providerConfig.endpoints) {
      const record = await runSuite(config, providerConfig, endpoint);
      if (record) records.push(record);
    }
  }
  const output = path.join(root, "outputs", "original-baselines.import.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ generated_at: new Date().toISOString(), records }, null, 2));
  console.log(`wrote ${records.length} records to ${output}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
