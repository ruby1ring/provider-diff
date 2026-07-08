import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sandbox = { window: {}, PROTOCOL_CATALOG_DEFS: [] };
for (const filename of ["channel-route-core.js", "channel-performance.js"]) {
  const code = await readFile(path.join(__dirname, filename), "utf8");
  vm.runInNewContext(code, sandbox);
}
const ROUTE_CORE = sandbox.window.NOCTUA_CHANNEL_ROUTE_CORE;
const PERF = sandbox.window.NOCTUA_CHANNEL_PERFORMANCE;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const chat = ROUTE_CORE.benchmarkEndpointForProtocol("chat_completions");
assert(chat.backend === "openai-chat" && chat.endpoint === "/v1/chat/completions", "chat endpoint");

const anthropic = ROUTE_CORE.benchmarkEndpointForProtocol("anthropic_messages");
assert(anthropic.endpoint === "/messages", "anthropic endpoint");

const bucket = { channelConfigs: {} };
const route = { platformId: "deepseek", endpointUrl: "https://api.deepseek.com" };
const config = ROUTE_CORE.ensureChannelConfig(bucket, "deepseek:chat", route, {});
assert(config.baseUrl === "https://api.deepseek.com", "ensure config base url");

const payload = PERF.buildBenchmarkRequest({
  route: { apiModelId: "deepseek-chat", platformName: "DeepSeek" },
  config: { baseUrl: "https://api.example.com", apiKey: "sk-test", useLocalKey: false },
  protocolId: "chat_completions",
  modelId: "deepseek-v4-pro",
  benchmark: { num_prompts: 50 },
  proxy: { enabled: false, url: "", mode: "direct" }
});
assert(payload.model === "deepseek-chat", "payload model");
assert(payload.num_prompts === 50, "payload num_prompts");
assert(payload.endpoint === "/v1/chat/completions", "payload endpoint");

const channelResults = [
  {
    channel_key: "a",
    platformName: "A",
    summary: { output_throughput: 100, mean_ttft_ms: 200 }
  },
  {
    channel_key: "b",
    platformName: "B",
    summary: { output_throughput: 150, mean_ttft_ms: 120 }
  }
];
const comparison = PERF.buildPerformanceComparison(channelResults);
assert(comparison.best_output_throughput.channel_key === "b", "best throughput");
assert(comparison.lowest_mean_ttft_ms.channel_key === "b", "lowest ttft");

const record = PERF.createChannelPerformanceReportRecord({
  modelId: "glm-5",
  protocolId: "chat_completions",
  baseline: { key: "a", platformName: "A", protocolLabel: "Chat", apiModelId: "glm-5" },
  targets: [{ key: "b", platformName: "B", protocolLabel: "Chat", apiModelId: "glm-5" }],
  channelResults
});
assert(record.tool === "channel-performance", "report tool");
assert(record.results.length === 2, "report results");
assert(record.comparison.best_output_throughput, "report comparison");

const table = PERF.comparisonTableRows(record);
assert(table.channels.length === 2, "comparison table channels");
assert(table.rows.length > 0, "comparison table rows");

console.log("channel-performance.test.mjs: all passed");
