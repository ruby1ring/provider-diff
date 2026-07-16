#!/usr/bin/env node
/**
 * 隐性参数 / 文档冲突实测探针（规则 1.2 / 1.1.2 的执行工具）。
 *
 * 用途：当「官方文档对照」或人工审阅发现存量文档与官方文档描述冲突、
 * 或厂商文档未声明某参数时，用真实请求复测并给出三类边界结论：
 *   - rejected_on_pass    传参直接 4xx（undocumented_rejected，兼容风险）
 *   - silent_ignore       2xx 且未观察到行为差异（ignored / accepted_ineffective）
 *   - silent_effective    2xx 且实测改变了响应（doc_gap，须补文档）
 *
 * 结果写入 outputs/param-boundary-probe.json，作为文档「来源：实测」回写的依据。
 *
 * 用法：
 *   node scripts/probe-param-boundary.mjs                 # 跑全部探针
 *   node scripts/probe-param-boundary.mjs --provider deepseek,moonshot
 *   node scripts/probe-param-boundary.mjs --only deepseek_user_top_level
 *
 * API Key 读取 config.yaml（段名与探针的 provider 一致）。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_PATH = path.join(ROOT, "outputs/param-boundary-probe.json");
const HELLO = [{ role: "user", content: "用一句中文打个招呼。" }];
const COUNT_PROMPT = [{ role: "user", content: "从一数到十，用中文数字，用空格分隔，不要输出其他内容。" }];

// ---------------------------------------------------------------------------
// config.yaml：段名后两行分别是 base_url 与 api_key（项目自有格式，非标准 YAML map）
function loadConfigKeys() {
  const configPath = path.join(ROOT, "config.yaml");
  if (!fs.existsSync(configPath)) return {};
  const sections = {};
  let current = null;
  for (const line of fs.readFileSync(configPath, "utf8").split("\n")) {
    const sectionMatch = line.match(/^([a-z0-9-]+):\s*$/i);
    if (sectionMatch) {
      current = sectionMatch[1];
      sections[current] = { base_url: "", api_key: "" };
      continue;
    }
    const value = line.trim();
    if (!current || !value || value.startsWith("#")) continue;
    if (/^https?:\/\//.test(value)) sections[current].base_url = value;
    else if (!sections[current].api_key) sections[current].api_key = value;
  }
  return sections;
}

// ---------------------------------------------------------------------------
// 探针定义。detect 决定“生效性”判定方式：
//   acceptance        只看 HTTP 状态（无法观测效果的参数，如 user/metadata）
//   choices_count     payload.n=N 时 choices.length===N 视为生效
//   logprobs_field    choices[0].logprobs 非空视为生效
//   stop_effect       输出不含 needle 视为生效（配 COUNT_PROMPT）
//   reasoning_presence 观测型：记录 reasoning_content / thinking 块是否出现
//   stream_usage_shape 观测型：记录 SSE 末尾块的 usage/choices 形状
const PROBES = [
  // ---- DeepSeek chat（官方 schema 无 user；reasoning_effort 已移入 thinking 对象）----
  {
    id: "deepseek_user_top_level",
    provider: "deepseek",
    path: "/chat/completions",
    param: "user",
    doc_conflict: "存量文档曾补录顶层 user；官方 schema 只有 user_id",
    payload: { model: "deepseek-v4-flash", messages: HELLO, max_tokens: 32, thinking: { type: "disabled" }, user: "noctua-probe" },
    detect: "acceptance"
  },
  {
    id: "deepseek_reasoning_effort_top_level",
    provider: "deepseek",
    path: "/chat/completions",
    param: "reasoning_effort",
    doc_conflict: "官方文档已把 reasoning_effort 移入 thinking 对象；顶层写法是否仍被接受",
    payload: { model: "deepseek-v4-flash", messages: HELLO, max_tokens: 1024, thinking: { type: "enabled" }, reasoning_effort: "high" },
    detect: "acceptance"
  },
  {
    id: "deepseek_reasoning_effort_nested",
    provider: "deepseek",
    path: "/chat/completions",
    param: "thinking.reasoning_effort",
    doc_conflict: "官方最新写法（嵌套）验证",
    payload: { model: "deepseek-v4-flash", messages: HELLO, max_tokens: 1024, thinking: { type: "enabled", reasoning_effort: "high" } },
    detect: "acceptance"
  },
  {
    id: "deepseek_logprobs_thinking",
    provider: "deepseek",
    path: "/chat/completions",
    param: "logprobs",
    doc_conflict: "思考模式忽略清单未提 logprobs，行为未知",
    payload: { model: "deepseek-v4-flash", messages: HELLO, max_tokens: 1024, thinking: { type: "enabled" }, logprobs: true, top_logprobs: 2 },
    detect: "logprobs_field"
  },
  {
    id: "deepseek_stream_usage_position",
    provider: "deepseek",
    path: "/chat/completions",
    param: "stream_options.include_usage",
    doc_conflict: "官方称 usage 在 [DONE] 前独立空 choices 块；历史实测观察到与 finish_reason 同块",
    payload: { model: "deepseek-v4-flash", messages: HELLO, max_tokens: 32, thinking: { type: "disabled" }, stream: true, stream_options: { include_usage: true } },
    detect: "stream_usage_shape"
  },
  // ---- DeepSeek Anthropic Messages（官方支持表无 input/user/user_id）----
  {
    id: "deepseek_msgs_user_top_level",
    provider: "deepseek",
    base_url: "https://api.deepseek.com/anthropic/v1",
    path: "/messages",
    protocol: "anthropic",
    param: "user",
    doc_conflict: "存量文档曾补录；官方 anthropic_api 支持表无此参数",
    payload: { model: "deepseek-v4-flash", max_tokens: 64, messages: [{ role: "user", content: "用一句中文打个招呼。" }], user: "noctua-probe" },
    detect: "acceptance"
  },
  {
    id: "deepseek_msgs_input_top_level",
    provider: "deepseek",
    base_url: "https://api.deepseek.com/anthropic/v1",
    path: "/messages",
    protocol: "anthropic",
    param: "input",
    doc_conflict: "存量文档曾补录；官方 anthropic_api 支持表无此参数",
    payload: { model: "deepseek-v4-flash", max_tokens: 64, messages: [{ role: "user", content: "用一句中文打个招呼。" }], input: "hello" },
    detect: "acceptance"
  },
  // ---- Moonshot / Kimi（k2 系列采样参数官方称“指定其他值会报错”；v1 系列支持）----
  {
    id: "moonshot_k2_temperature",
    provider: "moonshot",
    path: "/chat/completions",
    param: "temperature",
    doc_conflict: "K2.6 quickstart：k2 系列 temperature 固定值，指定其他值会报错",
    payload: { model: "kimi-k2.5", messages: HELLO, max_completion_tokens: 512, temperature: 0.2 },
    detect: "acceptance"
  },
  {
    id: "moonshot_k2_top_p",
    provider: "moonshot",
    path: "/chat/completions",
    param: "top_p",
    doc_conflict: "同上：k2 系列 top_p 固定 0.95",
    payload: { model: "kimi-k2.5", messages: HELLO, max_completion_tokens: 512, top_p: 0.5 },
    detect: "acceptance"
  },
  {
    id: "moonshot_k2_n",
    provider: "moonshot",
    path: "/chat/completions",
    param: "n",
    doc_conflict: "官方：n 仅在 MoonshotV1ChatRequest 定义，k2 不支持",
    payload: { model: "kimi-k2.5", messages: HELLO, max_completion_tokens: 512, n: 2 },
    detect: "choices_count"
  },
  {
    id: "moonshot_k2_presence_penalty",
    provider: "moonshot",
    path: "/chat/completions",
    param: "presence_penalty",
    doc_conflict: "官方：presence_penalty 仅 moonshot-v1 系列",
    payload: { model: "kimi-k2.5", messages: HELLO, max_completion_tokens: 512, presence_penalty: 1 },
    detect: "acceptance"
  },
  {
    id: "moonshot_v1_temperature_control",
    provider: "moonshot",
    path: "/chat/completions",
    param: "temperature",
    doc_conflict: "对照组：moonshot-v1 系列官方支持 temperature（应正常接受）",
    payload: { model: "moonshot-v1-8k", messages: HELLO, max_tokens: 64, temperature: 0.2 },
    detect: "acceptance"
  },
  {
    id: "moonshot_k2_user",
    provider: "moonshot",
    path: "/chat/completions",
    param: "user",
    doc_conflict: "存量文档曾补录 user；官方 schema 无",
    payload: { model: "kimi-k2.5", messages: HELLO, max_completion_tokens: 512, user: "noctua-probe" },
    detect: "acceptance"
  },
  {
    id: "moonshot_k25_thinking_keep",
    provider: "moonshot",
    path: "/chat/completions",
    param: "thinking.keep",
    doc_conflict: "官方：kimi-k2.5 不支持 keep 字段",
    payload: { model: "kimi-k2.5", messages: HELLO, max_completion_tokens: 512, thinking: { type: "enabled", keep: "all" } },
    detect: "acceptance"
  },
  {
    id: "moonshot_k27code_thinking_disabled",
    provider: "moonshot",
    path: "/chat/completions",
    param: "thinking.type=disabled",
    doc_conflict: "官方：kimi-k2.7-code 始终开启思考，disabled 是否报错",
    payload: { model: "kimi-k2.7-code", messages: HELLO, max_completion_tokens: 512, thinking: { type: "disabled" } },
    detect: "acceptance"
  },
  // ---- 智谱（stop 仅支持单个停止词；temperature 限两位小数；seed/penalty 未文档化）----
  {
    id: "zhipu_stop_multiple",
    provider: "zhipu",
    path: "chat/completions",
    param: "stop[2]",
    doc_conflict: "官方：目前仅支持单个停止词；传两个元素的行为未知",
    payload: { model: "glm-4.7-flash", messages: COUNT_PROMPT, max_tokens: 128, stop: ["五", "六"] },
    detect: "stop_effect",
    stop_needle: "五"
  },
  {
    id: "zhipu_temperature_precision",
    provider: "zhipu",
    path: "chat/completions",
    param: "temperature=0.123",
    doc_conflict: "官方：temperature 限两位小数；三位小数是否报错",
    payload: { model: "glm-4.7-flash", messages: HELLO, max_tokens: 32, temperature: 0.123 },
    detect: "acceptance"
  },
  {
    id: "zhipu_seed_probe",
    provider: "zhipu",
    path: "chat/completions",
    param: "seed",
    doc_conflict: "官方文档不存在 seed 参数（隐性参数三类边界）",
    payload: { model: "glm-4.7-flash", messages: HELLO, max_tokens: 32, seed: 42 },
    detect: "acceptance"
  },
  {
    id: "zhipu_frequency_penalty_probe",
    provider: "zhipu",
    path: "chat/completions",
    param: "frequency_penalty",
    doc_conflict: "官方文档不存在 frequency_penalty（隐性参数三类边界）",
    payload: { model: "glm-4.7-flash", messages: HELLO, max_tokens: 32, frequency_penalty: 0.5 },
    detect: "acceptance"
  },
  {
    id: "zhipu_logprobs_probe",
    provider: "zhipu",
    path: "chat/completions",
    param: "logprobs",
    doc_conflict: "官方文档不存在 logprobs（隐性参数三类边界）",
    payload: { model: "glm-4.7-flash", messages: HELLO, max_tokens: 32, logprobs: true },
    detect: "logprobs_field"
  },
  {
    id: "zhipu_do_sample_false",
    provider: "zhipu",
    path: "chat/completions",
    param: "do_sample",
    doc_conflict: "智谱特有采样总开关（官方支持，验收对照组）",
    payload: { model: "glm-4.7-flash", messages: HELLO, max_tokens: 32, do_sample: false, temperature: 0.9 },
    detect: "acceptance"
  },
  // ---- MiniMax chat（官方 schema 无 n/stop/user/logit_bias；M2.x 思考不可关）----
  {
    id: "minimax_n_probe",
    provider: "minimax",
    path: "/chat/completions",
    param: "n",
    doc_conflict: "官方 schema 未定义 n（隐性参数三类边界）",
    payload: { model: "MiniMax-M2.7", messages: HELLO, max_completion_tokens: 1024, n: 2 },
    detect: "choices_count"
  },
  {
    id: "minimax_stop_effect",
    provider: "minimax",
    path: "/chat/completions",
    param: "stop",
    doc_conflict: "官方 schema 未定义 stop；实测是否生效（隐性参数三类边界）",
    payload: { model: "MiniMax-M2.7", messages: COUNT_PROMPT, max_completion_tokens: 2048, stop: ["五"] },
    detect: "stop_effect",
    stop_needle: "五"
  },
  {
    id: "minimax_user_probe",
    provider: "minimax",
    path: "/chat/completions",
    param: "user",
    doc_conflict: "存量文档曾补录 user；官方 schema 无",
    payload: { model: "MiniMax-M2.7", messages: HELLO, max_completion_tokens: 1024, user: "noctua-probe" },
    detect: "acceptance"
  },
  {
    id: "minimax_logit_bias_probe",
    provider: "minimax",
    path: "/chat/completions",
    param: "logit_bias",
    doc_conflict: "官方 schema 未定义 logit_bias（隐性参数三类边界）",
    payload: { model: "MiniMax-M2.7", messages: HELLO, max_completion_tokens: 1024, logit_bias: { "100": -100 } },
    detect: "acceptance"
  },
  {
    id: "minimax_m2x_thinking_disabled",
    provider: "minimax",
    path: "/chat/completions",
    param: "thinking.type=disabled",
    doc_conflict: "官方：M2.x 思考不可关闭，disabled 被接受但思考照旧",
    payload: { model: "MiniMax-M2.7", messages: HELLO, max_completion_tokens: 2048, thinking: { type: "disabled" }, reasoning_split: true },
    detect: "reasoning_presence"
  },
  // ---- MiniMax Anthropic Messages（max_tokens 必填；stop_sequences 官方明示忽略）----
  {
    id: "minimax_msgs_no_max_tokens",
    provider: "minimax",
    base_url: "https://api.minimaxi.com/anthropic/v1",
    path: "/messages",
    protocol: "anthropic",
    param: "max_tokens(缺省)",
    doc_conflict: "官方：max_tokens 必填；存量正文标非必填",
    payload: { model: "MiniMax-M2.7", messages: [{ role: "user", content: "用一句中文打个招呼。" }] },
    detect: "acceptance"
  },
  {
    id: "minimax_msgs_stop_sequences",
    provider: "minimax",
    base_url: "https://api.minimaxi.com/anthropic/v1",
    path: "/messages",
    protocol: "anthropic",
    param: "stop_sequences",
    doc_conflict: "官方：stop_sequences 将被忽略；验证生成是否越过停止词",
    payload: { model: "MiniMax-M2.7", max_tokens: 2048, messages: [{ role: "user", content: "从一数到十，用中文数字，用空格分隔，不要输出其他内容。" }], stop_sequences: ["五"] },
    detect: "stop_effect",
    stop_needle: "五"
  },
  // ---- 阿里云百炼 compatible-mode（官方文档无 user/service_tier/frequency_penalty/logit_bias）----
  {
    id: "ali_user_probe",
    provider: "aliyun-us",
    base_url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    path: "/chat/completions",
    param: "user",
    doc_conflict: "存量文档曾补录 user；官方文档无（隐性参数三类边界）",
    payload: { model: "qwen3.6-flash", messages: HELLO, max_tokens: 32, user: "noctua-probe" },
    detect: "acceptance"
  },
  {
    id: "ali_service_tier_probe",
    provider: "aliyun-us",
    base_url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    path: "/chat/completions",
    param: "service_tier",
    doc_conflict: "存量文档曾补录；官方仅作为响应字段（隐性参数三类边界）",
    payload: { model: "qwen3.6-flash", messages: HELLO, max_tokens: 32, service_tier: "default" },
    detect: "acceptance"
  },
  {
    id: "ali_frequency_penalty_probe",
    provider: "aliyun-us",
    base_url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    path: "/chat/completions",
    param: "frequency_penalty",
    doc_conflict: "官方文档确认没有 frequency_penalty（隐性参数三类边界）",
    payload: { model: "qwen3.6-flash", messages: HELLO, max_tokens: 32, frequency_penalty: 0.5 },
    detect: "acceptance"
  },
  {
    id: "ali_logit_bias_probe",
    provider: "aliyun-us",
    base_url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    path: "/chat/completions",
    param: "logit_bias",
    doc_conflict: "官方文档确认没有 logit_bias（隐性参数三类边界）",
    payload: { model: "qwen3.6-flash", messages: HELLO, max_tokens: 32, logit_bias: { "100": -100 } },
    detect: "acceptance"
  },
  {
    id: "ali_responses_max_output_tokens",
    provider: "aliyun-us",
    base_url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    path: "/responses",
    param: "max_output_tokens",
    doc_conflict: "存量 Responses 文档收录 max_output_tokens；官方最新文档已无此参数",
    payload: { model: "qwen3.6-flash", input: "用一句中文打个招呼。", max_output_tokens: 64 },
    detect: "acceptance"
  },
  {
    id: "ali_responses_parallel_tool_calls",
    provider: "aliyun-us",
    base_url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    path: "/responses",
    param: "parallel_tool_calls",
    doc_conflict: "官方两次抓取不一致：请求参数 vs 仅响应字段",
    payload: { model: "qwen3.6-flash", input: "用一句中文打个招呼。", parallel_tool_calls: false },
    detect: "acceptance"
  },
  // ---- SiliconFlow chat（官方 schema 无 tool_choice/user；temperature 无范围声明；messages maxItems:10）----
  {
    id: "sf_tool_choice_probe",
    provider: "siliconflow-cn",
    path: "/chat/completions",
    param: "tool_choice",
    doc_conflict: "官方 chat schema 无 tool_choice（messages 协议才有）；网关是否接受",
    payload: {
      model: "Qwen/Qwen3-8B", messages: HELLO, max_tokens: 64, enable_thinking: false,
      tools: [{ type: "function", function: { name: "get_weather", description: "查天气", parameters: { type: "object", properties: { city: { type: "string" } } } } }],
      tool_choice: "auto"
    },
    detect: "acceptance"
  },
  {
    id: "sf_user_probe",
    provider: "siliconflow-cn",
    path: "/chat/completions",
    param: "user",
    doc_conflict: "存量文档曾补录 user；官方 schema 无（隐性参数三类边界）",
    payload: { model: "Qwen/Qwen3-8B", messages: HELLO, max_tokens: 32, enable_thinking: false, user: "noctua-probe" },
    detect: "acceptance"
  },
  {
    id: "sf_temperature_over_2",
    provider: "siliconflow-cn",
    path: "/chat/completions",
    param: "temperature=2.5",
    doc_conflict: "存量记载 ≤2；官方 schema 已撤掉范围声明，上界实测",
    payload: { model: "Qwen/Qwen3-8B", messages: HELLO, max_tokens: 32, enable_thinking: false, temperature: 2.5 },
    detect: "acceptance"
  },
  {
    id: "sf_messages_11_items",
    provider: "siliconflow-cn",
    path: "/chat/completions",
    param: "messages[11]",
    doc_conflict: "官方 schema：messages maxItems=10；第 11 条是否 400",
    payload: {
      model: "Qwen/Qwen3-8B", max_tokens: 32, enable_thinking: false,
      messages: [
        { role: "user", content: "1" }, { role: "assistant", content: "1" },
        { role: "user", content: "2" }, { role: "assistant", content: "2" },
        { role: "user", content: "3" }, { role: "assistant", content: "3" },
        { role: "user", content: "4" }, { role: "assistant", content: "4" },
        { role: "user", content: "5" }, { role: "assistant", content: "5" },
        { role: "user", content: "用一句中文打个招呼。" }
      ]
    },
    detect: "acceptance"
  },
  // ---- OpenRouter（transforms 已从 OpenAPI 移除；route 已废弃；include_usage 声明恒开）----
  {
    id: "or_transforms_legacy",
    provider: "openrouter",
    path: "/chat/completions",
    param: "transforms",
    doc_conflict: "官方 OpenAPI 已整体移除 transforms（改 plugins.context-compression）；旧参数传入行为",
    payload: { model: "deepseek/deepseek-v4-flash", messages: HELLO, max_tokens: 32, transforms: ["middle-out"] },
    detect: "acceptance"
  },
  {
    id: "or_route_legacy",
    provider: "openrouter",
    path: "/chat/completions",
    param: "route",
    doc_conflict: "官方：route 已废弃（映射到 providers.sort.partition）；旧值 fallback 兼容性",
    payload: { model: "deepseek/deepseek-v4-flash", messages: HELLO, max_tokens: 32, route: "fallback" },
    detect: "acceptance"
  },
  {
    id: "or_verbosity_probe",
    provider: "openrouter",
    path: "/chat/completions",
    param: "verbosity",
    doc_conflict: "参数说明页有 verbosity、ChatRequest schema 无；文档自相矛盾",
    payload: { model: "deepseek/deepseek-v4-flash", messages: HELLO, max_tokens: 32, verbosity: "low" },
    detect: "acceptance"
  },
  {
    id: "or_top_k_zero",
    provider: "openrouter",
    path: "/chat/completions",
    param: "top_k=0",
    doc_conflict: "top_k 下界口径不一（0 vs 1）",
    payload: { model: "deepseek/deepseek-v4-flash", messages: HELLO, max_tokens: 32, top_k: 0 },
    detect: "acceptance"
  },
  {
    id: "or_stream_usage_false",
    provider: "openrouter",
    path: "/chat/completions",
    param: "stream_options.include_usage=false",
    doc_conflict: "官方：include_usage 已无效果、usage 恒返回；实测 false 时 usage 是否仍出现",
    payload: { model: "deepseek/deepseek-v4-flash", messages: HELLO, max_tokens: 32, stream: true, stream_options: { include_usage: false } },
    detect: "stream_usage_shape"
  }
];

// ---------------------------------------------------------------------------
function joinUrl(base, p) {
  if (/^https?:\/\//.test(p)) return p;
  return `${base.replace(/\/+$/, "")}/${p.replace(/^\/+/, "")}`;
}

function extractText(body, protocol) {
  if (protocol === "anthropic") {
    return (body?.content || []).filter((b) => b?.type === "text").map((b) => b.text).join(" ");
  }
  return body?.choices?.map((c) => c?.message?.content || "").join(" ") || "";
}

function classify(probe, status, body, streamInfo) {
  // 401/402/403/429 是账号、余额、限流问题，不是对参数本身的拒绝，不能计入三类边界结论。
  // 部分渠道（如阿里 Arrearage 欠费）把账号问题裹在 400 里返回，按错误体特征识别。
  const errText = JSON.stringify(body || {});
  const accountIssue = /arrearage|insufficient[ _]balance|quota|not available in your region|overdue/i.test(errText);
  if ([401, 402, 403, 407, 429].includes(status) || (status >= 400 && accountIssue)) {
    return { conclusion: "blocked_account_or_quota", flag: null, evidence: `HTTP ${status}（${errText.slice(0, 120)}），与被测参数无关，需解决账号/区域问题后重测` };
  }
  if (status >= 400) return { conclusion: "rejected_on_pass", flag: "undocumented_rejected" };
  if (status < 200 || status >= 300) return { conclusion: "inconclusive", flag: null };
  switch (probe.detect) {
    case "choices_count": {
      const n = probe.payload.n;
      const got = Array.isArray(body?.choices) ? body.choices.length : 0;
      return got === n
        ? { conclusion: "silent_effective", flag: "doc_gap", evidence: `choices.length=${got}` }
        : { conclusion: "silent_ignore", flag: null, evidence: `choices.length=${got}` };
    }
    case "logprobs_field": {
      const lp = body?.choices?.[0]?.logprobs;
      return lp
        ? { conclusion: "silent_effective", flag: "doc_gap", evidence: "choices[0].logprobs 非空" }
        : { conclusion: "silent_ignore", flag: null, evidence: "choices[0].logprobs 为空" };
    }
    case "stop_effect": {
      const text = extractText(body, probe.protocol);
      const hit = text.includes(probe.stop_needle);
      return hit
        ? { conclusion: "silent_ignore", flag: null, evidence: `输出越过停止词「${probe.stop_needle}」: ${text.slice(0, 80)}` }
        : { conclusion: "silent_effective", flag: "doc_gap", evidence: `输出止于停止词前: ${text.slice(0, 80)}` };
    }
    case "reasoning_presence": {
      const msg = body?.choices?.[0]?.message || {};
      const hasReasoning = Boolean(msg.reasoning_content || msg.reasoning_details);
      return {
        conclusion: "observed",
        flag: null,
        evidence: hasReasoning ? "传 disabled 后 reasoning 内容仍出现（思考未被关闭）" : "传 disabled 后无 reasoning 内容（思考被关闭）"
      };
    }
    case "stream_usage_shape":
      return { conclusion: "observed", flag: null, evidence: streamInfo || "未捕获流事件" };
    default:
      return { conclusion: "silent_ignore", flag: null, evidence: "2xx；该参数无可观测效果，按接受但未证明生效记录" };
  }
}

async function runProbe(probe, section) {
  const base = probe.base_url || section.base_url;
  const url = joinUrl(base, probe.path);
  const headers = { "Content-Type": "application/json" };
  if (probe.protocol === "anthropic") {
    headers["x-api-key"] = section.api_key;
    headers["anthropic-version"] = "2023-06-01";
    headers["Authorization"] = `Bearer ${section.api_key}`;
  } else {
    headers["Authorization"] = `Bearer ${section.api_key}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(probe.payload),
      signal: controller.signal
    });
    const status = response.status;
    let body = null;
    let streamInfo = "";
    const contentType = response.headers.get("content-type") || "";
    if (probe.payload.stream && contentType.includes("event-stream")) {
      const raw = await response.text();
      const events = raw.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
      const tail = events.slice(-4).map((e) => {
        if (e === "[DONE]") return "[DONE]";
        try {
          const j = JSON.parse(e);
          return `choices=${JSON.stringify((j.choices || []).map((c) => ({ finish_reason: c.finish_reason ?? null, has_delta: Boolean(c.delta && Object.keys(c.delta).length) })))} usage=${j.usage ? "present" : "null"}`;
        } catch {
          return "unparsed";
        }
      });
      streamInfo = `SSE 末尾事件: ${tail.join(" | ")}`;
    } else {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    }
    const verdict = classify(probe, status, body, streamInfo);
    return {
      id: probe.id,
      provider: probe.provider,
      protocol: probe.protocol || "chat_completions",
      param: probe.param,
      model: probe.payload.model || null,
      doc_conflict: probe.doc_conflict,
      http_status: status,
      ...verdict,
      error_body: status >= 400 ? JSON.stringify(body)?.slice(0, 400) : undefined,
      latency_ms: Date.now() - started
    };
  } catch (err) {
    return {
      id: probe.id,
      provider: probe.provider,
      protocol: probe.protocol || "chat_completions",
      param: probe.param,
      model: probe.payload.model || null,
      doc_conflict: probe.doc_conflict,
      http_status: null,
      conclusion: "network_error",
      flag: null,
      evidence: String(err?.message || err).slice(0, 200),
      latency_ms: Date.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const providerArg = args.includes("--provider") ? args[args.indexOf("--provider") + 1] : "";
  const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";
  const providers = providerArg ? providerArg.split(",").map((s) => s.trim()) : null;
  const onlyIds = onlyArg ? onlyArg.split(",").map((s) => s.trim()) : null;

  const sections = loadConfigKeys();
  const selected = PROBES.filter((p) =>
    (!providers || providers.includes(p.provider)) && (!onlyIds || onlyIds.includes(p.id))
  );

  const results = [];
  for (const probe of selected) {
    const section = sections[probe.provider];
    if (!section?.api_key || section.api_key.includes("your-")) {
      results.push({ id: probe.id, provider: probe.provider, conclusion: "skipped_no_key" });
      console.log(`[probe] ${probe.id}: SKIP（config.yaml 无 ${probe.provider} key）`);
      continue;
    }
    const result = await runProbe(probe, section);
    results.push(result);
    console.log(`[probe] ${result.id}: HTTP ${result.http_status} → ${result.conclusion}${result.evidence ? `（${result.evidence.slice(0, 100)}）` : ""}`);
  }

  let existing = { results: [] };
  if (fs.existsSync(OUT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
    } catch {
      existing = { results: [] };
    }
  }
  const merged = new Map(existing.results.map((r) => [r.id, r]));
  for (const r of results) merged.set(r.id, { ...r, probed_at: new Date().toISOString() });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify({ generated_at: new Date().toISOString(), results: [...merged.values()] }, null, 2)}\n`);
  console.log(`\n→ ${path.relative(ROOT, OUT_PATH)}（${results.length} 条本轮，${merged.size} 条累计）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
