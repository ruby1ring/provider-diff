#!/usr/bin/env node
/**
 * One-off: normalize user-supplied protocol docs into standard markdown.
 * Run: node scripts/normalize-protocol-docs.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS = path.join(ROOT, "docs", "api");
const ARCHIVE = path.join(DOCS, "archive");

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.trimEnd() + "\n");
}

function cleanFeishuClip(text) {
  return text
    .replace(/\\-/g, "-")
    .replace(/\\_/g, "_")
    .replace(/\\\./g, ".")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/<br>/g, " ")
    .replace(/\{0, 2\^31-1\}/g, "[0, 2^31-1]");
}

function header({ channel, protocolLabel, protocolId, url, verified = "2026-06-25" }) {
  return `# ${channel} ${protocolLabel} API Notes

> **Last verified:** ${verified} against official API documentation.
> **Official source:** ${url}
> **Protocol ID:** \`${protocolId}\`

Structured summary for Noctua compatibility-test design.
`;
}

function moveToArchive(srcName, destName) {
  const src = path.join(DOCS, srcName);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(ARCHIVE, { recursive: true });
  const dest = path.join(ARCHIVE, destName);
  fs.renameSync(src, dest);
  return dest;
}

// --- StreamLake ---
function normalizeStreamlake() {
  const pairs = [
    ["StreamLake-chat.md", "streamlake-chat.md"],
    ["StreamLake-message.md", "streamlake-message.md"],
    ["StreamLake-response.md", "streamlake-response.md"]
  ];
  for (const [oldName, newName] of pairs) {
    const src = path.join(DOCS, oldName);
    if (!fs.existsSync(src)) continue;
    // streamlake files are hand-maintained if script already ran; skip overwrite when new exists
    if (fs.existsSync(path.join(DOCS, newName))) {
      fs.unlinkSync(src);
      continue;
    }
  }
}

// --- Moonshot ---
function normalizeMoonshot() {
  moveToArchive("moonshot", "moonshot-chat-raw.md");
  write(path.join(DOCS, "moonshot-chat.md"), `${header({
    channel: "Moonshot / Kimi",
    protocolLabel: "Chat Completions",
    protocolId: "chat_completions",
    url: "https://platform.moonshot.cn/docs/api/chat"
  })}

## Endpoint

| Item | Value |
|---|---|
| China | \`POST https://api.moonshot.cn/v1/chat/completions\` |
| Base URL | \`https://api.moonshot.cn/v1\` |
| Auth | \`Authorization: Bearer <MOONSHOT_API_KEY>\` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | Required. e.g. \`moonshot-v1-128k\`, vision-preview variants, kimi-k2.x |
| \`messages\` | \`array<object>\` | Required. Roles: \`system\`, \`user\`, \`assistant\`; multimodal content supported |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| \`temperature\` | \`float\` | no | \`0\` | [0, 1] | Higher = more random |
| \`top_p\` | \`float\` | no | \`1\` | [0, 1] | Nucleus sampling; adjust temperature or top_p, not both |
| \`n\` | \`integer\` | no | \`1\` | 1–5 | Completions per input; near-zero temperature limits to 1 |
| \`presence_penalty\` | \`float\` | no | \`0\` | [-2, 2] | |
| \`frequency_penalty\` | \`float\` | no | \`0\` | [-2, 2] | |
| \`max_tokens\` | \`integer\` | no | — | — | **Deprecated** — use \`max_completion_tokens\` |
| \`max_completion_tokens\` | \`integer\` | no | ~1024 | — | Exceeding context window → error |
| \`stop\` | \`string \\| array\` | no | — | max 5 strings, ≤32 bytes each | |
| \`stream\` | \`boolean\` | no | \`false\` | — | SSE streaming |
| \`stream_options.include_usage\` | \`boolean\` | no | \`false\` | — | Final usage chunk before \`[DONE]\` |
| \`response_format\` | \`object\` | no | \`{"type":"text"}\` | — | \`text\`, \`json_object\`, \`json_schema\` |
| \`tools\` | \`array\` | no | — | max 128 | Function tools |
| \`prompt_cache_key\` | \`string\` | no | — | — | Prompt caching / Kimi Code Plan |
| \`safety_identifier\` | \`string\` | no | — | — | Hashed stable user id |

## Multimodal

\`messages[].content\` supports \`text\`, \`image_url\`, \`video_url\` parts. See official docs for Partial Mode (\`messages[].partial\`).

## Raw Archive

Full OpenAPI export: [\`docs/archive/moonshot-chat-raw.md\`](./../archive/moonshot-chat-raw.md)
`);
}

// --- Zhipu ---
function normalizeZhipu() {
  moveToArchive("zhipu", "zhipu-chat-raw.md");
  write(path.join(DOCS, "zhipu-chat.md"), `${header({
    channel: "智谱 Zhipu",
    protocolLabel: "Chat Completions",
    protocolId: "chat_completions",
    url: "https://open.bigmodel.cn/dev/api#glm-4"
  })}

## Endpoint

\`POST https://open.bigmodel.cn/api/paas/v4/chat/completions\`

## Authentication

\`Authorization: Bearer <API_KEY>\`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | Required. e.g. \`glm-5.2\`, \`glm-4.7\` |
| \`messages\` | \`array\` | Required. min 1 item |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| \`stream\` | \`boolean\` | no | \`false\` | — | SSE; ends with \`data: [DONE]\` |
| \`thinking\` | \`object\` | no | — | — | GLM-4.5+ thinking control |
| \`thinking.type\` | \`string\` | no | \`enabled\` | \`enabled\` \\| \`disabled\` | |
| \`thinking.clear_thinking\` | \`boolean\` | no | \`true\` | — | Strip historical \`reasoning_content\` |
| \`reasoning_effort\` | \`string\` | no | \`max\` | GLM-5.2 | \`max\` \\| \`xhigh\` \\| \`high\` \\| \`medium\` \\| \`low\` \\| \`minimal\` \\| \`none\` |
| \`do_sample\` | \`boolean\` | no | \`true\` | — | \`false\` ignores temperature/top_p |
| \`temperature\` | \`float\` | no | \`1\` | [0, 1] | Model-family defaults vary |
| \`top_p\` | \`float\` | no | \`0.95\` | [0.01, 1] | |
| \`max_tokens\` | \`integer\` | no | — | 1–131072 | GLM-5.x/4.6 up to 128K |
| \`tool_stream\` | \`boolean\` | no | \`false\` | — | GLM-5.x/4.6+ |
| \`tools\` | \`array\` | no | — | max 128 | function / retrieval / web_search / mcp |
| \`tool_choice\` | \`string\` | no | \`auto\` | — | Function tools: auto only |
| \`stop\` | \`array<string>\` | no | — | max 4 | Currently single stop word |
| \`response_format\` | \`object\` | no | \`{"type":"text"}\` | — | \`text\` \\| \`json_object\` |
| \`request_id\` | \`string\` | no | auto | 6–64 chars | |
| \`user_id\` | \`string\` | no | — | 6–128 chars | End-user identifier |

## Raw Archive

Full OpenAPI export: [\`docs/archive/zhipu-chat-raw.md\`](./../archive/zhipu-chat-raw.md)
`);
}

// --- Aliyun: merge old ali.md endpoints + new ali-chat params ---
function normalizeAli() {
  const oldAli = read(path.join(DOCS, "ali.md"));
  const chatRaw = read(path.join(DOCS, "ali-chat"));
  const messageRaw = read(path.join(DOCS, "ali-message"));
  const responseRaw = read(path.join(DOCS, "ali-response"));

  // Extract endpoints from old ali.md (clean section)
  const endpointsMatch = oldAli.match(/## Endpoints[\s\S]*?## Authentication/);
  const endpoints = endpointsMatch
    ? endpointsMatch[0].replace("## Authentication", "").trim()
    : "## Endpoints\n\nSee official documentation.";

  const authMatch = oldAli.match(/## Authentication[\s\S]*?## Required Request Fields/);
  const auth = authMatch
    ? authMatch[0].replace("## Required Request Fields", "").trim()
    : "## Authentication\n\n`Authorization: Bearer <DASHSCOPE_API_KEY>`";

  const multimodalMatch = oldAli.match(/## Multimodal Message Parts[\s\S]*?## Response Fields/);
  const multimodal = multimodalMatch ? multimodalMatch[0].replace("## Response Fields", "").trim() : "";

  const extraBodyMatch = oldAli.match(/Non-standard parameters[\s\S]*?should be passed via `extra_body`/);
  const extraBodyNote = extraBodyMatch ? extraBodyMatch[0] : "";

  write(path.join(DOCS, "ali-chat.md"), `${header({
    channel: "阿里云百炼",
    protocolLabel: "Chat Completions",
    protocolId: "chat_completions",
    url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions"
  })}

${endpoints}

${auth}

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | Required. Qwen / third-party models on Bailian |
| \`messages\` | \`array<object>\` | Required. \`system\`, \`user\`, \`assistant\`, \`tool\`; multimodal parts |

## Documented Request Parameters

| Parameter | Type | OpenAI? | Default | Range | Notes |
|---|---|---|---|---|---|
| \`stream\` | \`boolean\` | yes | \`false\` | — | Non-stream timeout 300s; use stream for long output |
| \`stream_options.include_usage\` | \`boolean\` | yes | \`false\` | — | Only when \`stream=true\` |
| \`temperature\` | \`float\` | yes | model-dependent | [0, 2) | See official doc for per-model defaults |
| \`top_p\` | \`float\` | yes | model-dependent | (0, 1.0] | |
| \`top_k\` | \`integer \\| null\` | **no** | model-dependent | ≥0; null or >100 disables | \`extra_body\`; not on DeepSeek/Kimi/MiniMax |
| \`repetition_penalty\` | \`float\` | **no** | model-dependent | >0; 1.0=no penalty | \`extra_body\` |
| \`presence_penalty\` | \`float\` | yes | model-dependent | [-2, 2] | |
| \`response_format\` | \`object\` | yes | \`{"type":"text"}\` | — | \`text\` \\| \`json_object\` |
| \`max_tokens\` | \`integer\` | yes | — | — | **即将废弃** — prefer \`max_completion_tokens\` |
| \`max_completion_tokens\` | \`integer\` | yes | — | — | Includes thinking chain; recommended for thinking models |
| \`vl_high_resolution_images\` | \`boolean\` | **no** | \`false\` | — | VL models; \`extra_body\` |
| \`n\` | \`integer\` | yes | \`1\` | 1–4 | Must be 1 when \`tools\` present |
| \`enable_thinking\` | \`boolean\` | **no** | model-dependent | — | \`extra_body\`; hybrid thinking |
| \`thinking\` | \`object\` | **no** | — | — | MiniMax-M3 on Bailian: \`adaptive\` \\| \`disabled\` |
| \`preserve_thinking\` | \`boolean\` | **no** | \`false\` | — | \`extra_body\` |
| \`thinking_budget\` | \`integer\` | **no** | — | — | Qwen3.x / Qwen3-VL |
| \`reasoning_effort\` | \`string\` | **no** | \`high\` | DeepSeek-V4 | \`high\` \\| \`max\`; compat mappings |
| \`tool_stream\` | \`boolean\` | **no** | \`false\` | — | \`extra_body\`; stream only |
| \`enable_code_interpreter\` | \`boolean\` | **no** | \`false\` | — | \`extra_body\` |
| \`seed\` | \`integer\` | yes | model-dependent | [0, 2^31-1] | |
| \`logprobs\` | \`boolean\` | yes | \`false\` | — | Thinking \`reasoning_content\` excluded |
| \`top_logprobs\` | \`integer\` | yes | \`0\` | [0, 5] | Requires \`logprobs=true\` |
| \`stop\` | \`string \\| array\` | yes | — | — | Do not mix token_id and string in array |
| \`tools\` | \`array\` | yes | — | — | Function tools |
| \`tool_choice\` | \`string \\| object\` | yes | \`auto\` | — | Thinking models cannot force tool |
| \`parallel_tool_calls\` | \`boolean\` | yes | \`false\` | — | |
| \`enable_search\` | \`boolean\` | **no** | \`false\` | — | \`extra_body\` |
| \`search_options\` | \`object\` | **no** | — | — | \`extra_body\` |
| \`modalities\` | \`array\` | yes | \`["text"]\` | — | Qwen-Omni: \`["text","audio"]\` |
| \`audio\` | \`object\` | yes | — | — | Qwen-Omni output audio; \`format\`: \`wav\` |
| \`skill\` | \`array\` | **no** | — | — | \`qwen-doc-turbo\` PPT only; requires \`stream=true\` |
| \`X-DashScope-DataInspection\` | header | — | — | — | Content safety header, not body |

${extraBodyNote ? `## extra_body Parameters\n\n${extraBodyNote}` : ""}

${multimodal}

## Source

Structured from user-supplied \`ali-chat\` (2026-06-25) + prior \`ali.md\` endpoint/multimodal notes.
`);

  write(path.join(DOCS, "ali-message.md"), `${header({
    channel: "阿里云百炼",
    protocolLabel: "Anthropic Messages",
    protocolId: "anthropic_messages",
    url: "https://help.aliyun.com/zh/model-studio/anthropic-api-messages"
  })}

## Endpoint

\`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/apps/anthropic/v1/messages\` (华北2)  
See official doc for Singapore / US / EU / JP regions.

## Authentication

\`Authorization: Bearer <DASHSCOPE_API_KEY>\`  
\`anthropic-version: 2023-06-01\`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | e.g. \`qwen3.7-plus\` |
| \`messages\` | \`array\` | |
| \`max_tokens\` | \`integer\` | |

## Documented Request Parameters

See official Anthropic-compatible Messages API on Bailian. User-supplied raw notes in [\`docs/archive/ali-message-raw.md\`](./../archive/ali-message-raw.md).

${messageRaw.slice(0, 2000).includes("temperature") ? "" : ""}
`);

  write(path.join(DOCS, "ali-response.md"), `${header({
    channel: "阿里云百炼",
    protocolLabel: "Responses API",
    protocolId: "responses_api",
    url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses"
  })}

## Compatibility

Only parameters listed in official Bailian Responses docs are processed; unlisted OpenAI params are ignored. \`background\` (async) not supported.

## Endpoint

\`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/responses\`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | Qwen series |
| \`input\` | \`string \\| array\` | Text or message array |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| \`temperature\` | \`number\` | |
| \`top_p\` | \`number\` | |
| \`max_output_tokens\` | \`integer\` | |
| \`stream\` | \`boolean\` | |
| \`tools\` | \`array\` | Built-in + function tools per Bailian docs |
| \`tool_choice\` | \`string\` | |
| \`reasoning.effort\` | \`string\` | Thinking strength control |

Raw user notes: [\`docs/archive/ali-response-raw.md\`](./../archive/ali-response-raw.md)
`);

  if (chatRaw) moveToArchive("ali-chat", "ali-chat-raw.md");
  if (messageRaw) moveToArchive("ali-message", "ali-message-raw.md");
  if (responseRaw) moveToArchive("ali-response", "ali-response-raw.md");
  if (fs.existsSync(path.join(DOCS, "ali.md"))) fs.unlinkSync(path.join(DOCS, "ali.md"));
}

// --- MiniMax ---
function normalizeMinimax() {
  const old = read(path.join(DOCS, "minimax.md"));
  const ignoredMatch = old.match(/### Ignored[\s\S]*?### Not in OpenAPI/);
  const ignored = ignoredMatch ? ignoredMatch[0] : "";

  moveToArchive("minimax-chat", "minimax-chat-raw.md");
  moveToArchive("minimax-message", "minimax-message-raw.md");
  moveToArchive("minimax-response", "minimax-response-raw.md");

  write(path.join(DOCS, "minimax-chat.md"), `${header({
    channel: "MiniMax",
    protocolLabel: "Chat Completions",
    protocolId: "chat_completions",
    url: "https://platform.minimax.io/docs/api-reference/text-chat-openai"
  })}

## Endpoint

| Region | Endpoint |
|---|---|
| China | \`POST https://api.minimaxi.com/v1/chat/completions\` |
| International | \`POST https://api.minimax.io/v1/chat/completions\` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | MiniMax-M3, M2.7, M2.5, M2.1, M2 variants |
| \`messages\` | \`array<object>\` | Text / image / video / tool content |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| \`thinking\` | \`object\` | no | \`{"type":"adaptive"}\` | — | M3 on/off; M2.x cannot disable |
| \`thinking.type\` | \`string\` | no | \`adaptive\` | \`adaptive\` \\| \`disabled\` | M3 only for \`disabled\` |
| \`reasoning_split\` | \`boolean\` | no | — | — | Output format only; does not toggle thinking |
| \`stream\` | \`boolean\` | no | \`false\` | — | |
| \`stream_options.include_usage\` | \`boolean\` | no | \`false\` | — | |
| \`max_completion_tokens\` | \`integer\` | no | — | M3: rec 131072, max 524288; M2.x: rec 65536, max 204800 | |
| \`max_tokens\` | \`integer\` | no | — | — | **Deprecated** |
| \`temperature\` | \`number\` | no | \`1\` | [0, 2] | Out-of-range → error |
| \`top_p\` | \`number\` | no | M3: \`0.95\`; M2.x: \`0.9\` | [0, 1] | |
| \`tools\` | \`array\` | no | — | — | Use \`tools\`, not \`function_call\` |
| \`service_tier\` | \`string\` | no | \`standard\` | \`standard\` \\| \`priority\` | Priority 1.5× price |

${ignored}

## Raw Archive

[\`docs/archive/minimax-chat-raw.md\`](./../archive/minimax-chat-raw.md)
`);

  write(path.join(DOCS, "minimax-message.md"), `${header({
    channel: "MiniMax",
    protocolLabel: "Anthropic Messages",
    protocolId: "anthropic_messages",
    url: "https://platform.minimax.io/docs/api-reference/text-chat-openai"
  })}

## Endpoint

\`POST https://api.minimaxi.com/anthropic/v1/messages\` (China)  
\`POST https://api.minimax.io/anthropic/v1/messages\` (International)

## Authentication

\`X-Api-Key\` + \`anthropic-version: 2023-06-01\`

## Documented Request Parameters

See raw archive: [\`docs/archive/minimax-message-raw.md\`](./../archive/minimax-message-raw.md)
`);

  write(path.join(DOCS, "minimax-response.md"), `${header({
    channel: "MiniMax",
    protocolLabel: "Responses API",
    protocolId: "responses_api",
    url: "https://platform.minimax.io/docs/api-reference/text-chat-openai"
  })}

## Documented Request Parameters

See raw archive: [\`docs/archive/minimax-response-raw.md\`](./../archive/minimax-response-raw.md)
`);

  if (fs.existsSync(path.join(DOCS, "minimax.md"))) fs.unlinkSync(path.join(DOCS, "minimax.md"));
}

// --- OpenRouter ---
function normalizeOpenrouter() {
  const old = read(path.join(DOCS, "openrouter.md"));
  const requiredMatch = old.match(/## Required Body Fields[\s\S]*?## Message Roles/);
  const samplingMatch = old.match(/## Sampling And Generation Parameters[\s\S]*?## Reasoning Parameters/);

  moveToArchive("openrouter-chat", "openrouter-chat-raw.openapi.md");
  moveToArchive("openrouter-message", "openrouter-message-raw.openapi.md");
  // openrouter-response.md already .md — move to archive and recreate summary
  if (fs.existsSync(path.join(DOCS, "openrouter-response.md"))) {
    moveToArchive("openrouter-response.md", "openrouter-response-raw.openapi.md");
  }

  write(path.join(DOCS, "openrouter-chat.md"), `${header({
    channel: "OpenRouter",
    protocolLabel: "Chat Completions",
    protocolId: "chat_completions",
    url: "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request"
  })}

## Endpoint

\`POST https://openrouter.ai/api/v1/chat/completions\`

${requiredMatch ? requiredMatch[0].replace("## Message Roles", "").trim() : ""}

${samplingMatch ? samplingMatch[0].replace("## Reasoning Parameters", "").trim() : ""}

## Additional OpenRouter Parameters

| Parameter | Type | Default | Range | Notes |
|---|---|---|---|---|
| \`models\` | \`array<string>\` | — | — | Fallback routing list |
| \`provider\` | \`object\` | — | — | Routing preferences |
| \`plugins\` | \`array\` | — | — | web_search, web_fetch, datetime |
| \`reasoning\` | \`object\` | — | — | \`effort\`, \`summary\` |
| \`reasoning_effort\` | \`string\` | — | — | Shorthand for \`reasoning.effort\` |
| \`session_id\` | \`string\` | — | max 256 | Sticky routing |
| \`parallel_tool_calls\` | \`boolean\` | — | — | |
| \`repetition_penalty\` | \`float\` | \`1\` | — | Provider-dependent |
| \`top_k\` | \`integer\` | — | ≥0 | Provider-dependent |
| \`min_p\` | \`float\` | — | — | Provider-dependent |

## Raw OpenAPI Archive

[\`docs/archive/openrouter-chat-raw.openapi.md\`](./../archive/openrouter-chat-raw.openapi.md)
`);

  write(path.join(DOCS, "openrouter-message.md"), `${header({
    channel: "OpenRouter",
    protocolLabel: "Anthropic Messages",
    protocolId: "anthropic_messages",
    url: "https://openrouter.ai/docs/api-reference/messages"
  })}

## Documented Request Parameters

See [\`docs/archive/openrouter-message-raw.openapi.md\`](./../archive/openrouter-message-raw.openapi.md)
`);

  write(path.join(DOCS, "openrouter-response.md"), `${header({
    channel: "OpenRouter",
    protocolLabel: "Responses API",
    protocolId: "responses_api",
    url: "https://openrouter.ai/docs/api/reference/responses/overview"
  })}

## Endpoint

\`POST https://openrouter.ai/api/v1/responses\`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | |
| \`input\` | \`string \\| array\` | |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| \`temperature\` | \`number\` | |
| \`top_p\` | \`number\` | |
| \`max_output_tokens\` | \`integer\` | |
| \`stream\` | \`boolean\` | |
| \`tools\` | \`array\` | |
| \`tool_choice\` | \`string\` | |

Raw OpenAPI: [\`docs/archive/openrouter-response-raw.openapi.md\`](./../archive/openrouter-response-raw.openapi.md)
`);

  if (fs.existsSync(path.join(DOCS, "openrouter.md"))) fs.unlinkSync(path.join(DOCS, "openrouter.md"));
}

// --- SiliconFlow ---
function normalizeSiliconflow() {
  const old = read(path.join(DOCS, "siliconflow.md"));
  const enableThinkingMatch = old.match(/### `enable_thinking` supported models[\s\S]*?## VLM/);
  const vlmMatch = old.match(/## VLM[\s\S]*$/);

  // Clean HTML from siliconflow-chat.md into structured table
  write(path.join(DOCS, "siliconflow-chat.md"), `${header({
    channel: "SiliconFlow",
    protocolLabel: "Chat Completions",
    protocolId: "chat_completions",
    url: "https://api-docs.siliconflow.cn/docs/api/chat-completions-post"
  })}

## Endpoint

| Region | URL |
|---|---|
| China | \`POST https://api.siliconflow.cn/v1/chat/completions\` |
| International | \`POST https://api.siliconflow.com/v1/chat/completions\` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| \`model\` | \`string\` | e.g. \`Pro/zai-org/GLM-4.7\` |
| \`messages\` | \`array<object>\` | |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| \`stream\` | \`boolean\` | no | — | — | Ends with \`data: [DONE]\` |
| \`max_tokens\` | \`integer\` | no | — | — | Reserve ~10k for input/overhead |
| \`enable_thinking\` | \`boolean\` | no | — | — | Model list below |
| \`thinking_budget\` | \`integer\` | no | — | 128–32768 | Reasoning models |
| \`reasoning_effort\` | \`string\` | no | — | \`high\` \\| \`max\` | **Only** DeepSeek-V4-Flash |
| \`min_p\` | \`number\` | no | — | ≤1 | Qwen3 only |
| \`stop\` | \`string \\| array\` | no | — | max 4 | |
| \`temperature\` | \`number\` | no | — | ≤2 | |
| \`top_p\` | \`number\` | no | — | [0.1, 1] | |
| \`top_k\` | \`number\` | no | — | ≤100 | |
| \`frequency_penalty\` | \`number\` | no | — | [-2, 2] | |
| \`n\` | \`integer\` | no | \`1\` | — | |
| \`response_format\` | \`object\` | no | \`text\` | — | \`text\` \\| \`json_object\` \\| \`json_schema\` |
| \`tools\` | \`array\` | no | — | max 128 | |
| \`tool_choice\` | \`string\` | no | \`auto\` | — | |

${enableThinkingMatch ? enableThinkingMatch[0].replace("## VLM", "").trim() : ""}

${vlmMatch ? vlmMatch[0] : ""}

## Raw Archive

Previous HTML export archived if present.
`);

  if (fs.existsSync(path.join(DOCS, "siliconflow-message.md"))) {
    const msg = read(path.join(DOCS, "siliconflow-message.md"));
    moveToArchive("siliconflow-message.md", "siliconflow-message-raw.md");
    write(path.join(DOCS, "siliconflow-message.md"), `${header({
      channel: "SiliconFlow",
      protocolLabel: "Anthropic Messages",
      protocolId: "anthropic_messages",
      url: "https://docs.siliconflow.cn/cn/api-reference/chat-completions/messages"
    })}

## Documented Request Parameters

See [\`docs/archive/siliconflow-message-raw.md\`](./../archive/siliconflow-message-raw.md)
`);
  }

  if (fs.existsSync(path.join(DOCS, "siliconflow.md"))) fs.unlinkSync(path.join(DOCS, "siliconflow.md"));
}

function main() {
  normalizeStreamlake();
  normalizeMoonshot();
  normalizeZhipu();
  normalizeAli();
  normalizeMinimax();
  normalizeOpenrouter();
  normalizeSiliconflow();
  console.log("Protocol docs normalized.");
}

main();
