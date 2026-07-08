---
channel_id: deepseek
protocol_id: chat_completions
doc_status: verified
doc_url: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, stop, frequency_penalty, presence_penalty]
  Length: [max_tokens]
  Reasoning.Switch: [thinking]
  Reasoning.Intensity: [reasoning_effort]
  Output.Structure: [response_format]
  Tools: [tools, tool_choice, tools[].function.strict]
  Protocol: [stream, stream_options, stream_options.include_usage]
  Debug: [logprobs, top_logprobs]
  Metadata: [user_id]
  Beta: [messages[].prefix, messages[].reasoning_content]
  Observed: [user]
notes: 对照 docs/api/deepseek.md（2026-06-16）。frequency_penalty / presence_penalty 已 deprecated，接受但无效果。 类型字段按该渠道官方 API 原文收录。 2026-07-08 联网对照官方文档已补录参数：user。
---
# DeepSeek Chat Completions API Notes


Supplementary sources:

- https://api-docs.deepseek.com/zh-cn/
- https://api-docs.deepseek.com/zh-cn/quick_start/pricing
- https://api-docs.deepseek.com/zh-cn/guides/thinking_mode

Structured summary for compatibility-test design; not a verbatim mirror of the docs.

## Endpoint

```http
POST https://api.deepseek.com/chat/completions
```

OpenAI-compatible `base_url`:

```text
https://api.deepseek.com
```

Beta chat-prefix-completion base URL:

```text
https://api.deepseek.com/beta
```

Anthropic-compatible Messages base URL (tester appends `/messages`):

```text
https://api.deepseek.com/anthropic/v1
```

## Authentication

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Anthropic Messages:

```http
X-Api-Key: <token>
anthropic-version: 2023-06-01
Content-Type: application/json
```

## Models

| Model | Notes |
|---|---|
| `deepseek-v4-flash` | Documented chat model. Supports thinking and non-thinking modes. |
| `deepseek-v4-pro` | Documented chat model. Supports thinking and non-thinking modes. |
| `deepseek-chat` | Compatibility alias; quick-start says deprecated on `2026-07-24`, maps to `deepseek-v4-flash` non-thinking. |
| `deepseek-reasoner` | Compatibility alias; quick-start says deprecated on `2026-07-24`, maps to `deepseek-v4-flash` thinking. |

## Required Request Fields

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | 必填。文档取值：`deepseek-v4-flash`、`deepseek-v4-pro`。 |
| `messages` | `array<object>` | 必填。至少一条消息。角色：`system`、`user`、`assistant`、`tool`。 |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 必填。 |
| `messages` | `array<object>` | 必填。 |
| `thinking` | `object \| null` | 思考模式开关：`{"type":"enabled"}` 或 `{"type":"disabled"}`，默认 `enabled`。OpenAI SDK 请通过 `extra_body` 传入。 |
| `reasoning_effort` | `string` | 推理强度：`high`、`max`。普通请求默认 `high`；复杂 Agent 请求可能自动使用 `max`。`low`/`medium` 映射为 `high`，`xhigh` 映射为 `max`。 |
| `max_tokens` | `integer \| null` | 最大补全 token 数。输入与输出合计受上下文窗口限制。 |
| `response_format` | `object \| null` | 默认 `{ "type": "text" }` 或 `{ "type": "json_object" }`。JSON 模式仍需在提示词中说明格式要求。 |
| `stop` | `string \| array<string> \| null` | 停止词，数组形式最多 16 个字符串。 |
| `stream` | `boolean \| null` | SSE 流式输出；以 `data: [DONE]` 结束。 |
| `stream_options` | `object \| null` | 仅当 `stream=true` 时生效。 |
| `stream_options.include_usage` | `boolean` | 在 `[DONE]` 前额外返回一块含完整 `usage`、空 `choices` 的数据块。 |
| `temperature` | `number \| null` | 默认 `1`，最大 `2`。思考模式下接受但无效果。 |
| `top_p` | `number \| null` | 默认 `1`，最大 `1`。思考模式下接受但无效果。 |
| `tools` | `array<object> \| null` | 仅支持函数工具；最多 128 个。 |
| `tool_choice` | `string \| object \| null` | 取值 `none`、`auto`、`required` 或指定函数。无 tools 时默认 `none`，有 tools 时默认 `auto`。 |
| `tools[].function.strict` | `boolean` | 默认 `false`。Beta 严格 JSON Schema 模式。 |
| `logprobs` | `boolean \| null` | 是否返回输出 token 的对数概率。 |
| `top_logprobs` | `integer \| null` | 范围 `0`–`20`；需 `logprobs=true`。 |
| `user_id` | `string \| null` | 字符集 `[a-zA-Z0-9\-_]`，最长 512。用于安全、KVCache 隔离与调度。 |
| `frequency_penalty` | deprecated | 无效果（已废弃）。 |
| `presence_penalty` | deprecated | 无效果（已废弃）。 |

## Beta Message Fields

| Field | Notes |
|---|---|
| `messages[].prefix` | Assistant prefix continuation; requires beta base URL. |
| `messages[].reasoning_content` | Assistant input reasoning for prefix completion in thinking mode; `prefix` must be `true`. |

## Thinking Mode

| Control | Shape | Notes |
|---|---|---|
| On/off | `thinking.type` = `enabled` / `disabled` | Default enabled. |
| Strength | `reasoning_effort` = `high` / `max` | Compatibility mappings for `low`, `medium`, `xhigh`. |

Thinking-mode notes:

- `temperature`, `top_p`, `presence_penalty`, `frequency_penalty` accepted but ignored.
- Response may include `choices[].message.reasoning_content`.
- Streaming may include `choices[].delta.reasoning_content`.
- After tool calls in thinking mode, assistant `reasoning_content` must be preserved in follow-up requests or API may return `400`.

## Response Fields (non-streaming)

| Field | Notes |
|---|---|
| `id`, `object`, `created`, `model`, `system_fingerprint` | Standard chat.completion metadata. |
| `choices[].message.content` | Final answer. |
| `choices[].message.reasoning_content` | Thinking content (thinking mode). |
| `choices[].message.tool_calls` | Function calls; `arguments` is JSON text — validate before use. |
| `choices[].finish_reason` | `stop`, `length`, `content_filter`, `tool_calls`, `insufficient_system_resource`. |
| `usage.prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` | Cache breakdown. |
| `usage.completion_tokens_details.reasoning_tokens` | Reasoning token count. |

## Streaming

Chunks are `chat.completion.chunk`; stream ends with `data: [DONE]`. Supports `delta.content`, `delta.reasoning_content`, `delta.tool_calls`, and optional final `usage` chunk when `include_usage=true`.

Official docs describe the OpenAI-compatible pattern: a separate pre-`[DONE]` chunk with `choices: []` and aggregate `usage`. **Probe note:** the DeepSeek official API (`api.deepseek.com`) has been observed to return `usage` in the same chunk as `finish_reason` (`merged_finish_reason` profile). Use case `deepseek_protocol_stream_usage_chunk_shape` to validate chunk placement; case `deepseek_protocol_stream_include_usage` only checks presence of usage fields.

## Test Groups

| Group | Parameters |
|---|---|
| Core | `model`, `messages` |
| Sampling | `temperature`, `top_p`, `stop` |
| Ignored | `frequency_penalty`, `presence_penalty` |
| Length | `max_tokens` |
| Reasoning | `thinking`, `reasoning_effort`, `reasoning_content` |
| Output | `response_format` |
| Tools | `tools`, `tool_choice`, `tools[].function.strict` |
| Protocol | `stream`, `stream_options.include_usage` |
| Debug | `logprobs`, `top_logprobs` |
| Metadata | `user_id` |
| Beta | `messages[].prefix`, `messages[].reasoning_content` |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `number \| null`；默认 `1`；最大 `2` | 待实测 | |
| `2` | integer | 类型 `number \| null`；最大 `2` | 待实测 | |
| `1.0` | float | 类型 `number \| null`；默认 `1`；最大 `2` | 待实测 | |
| `2.0` | float | 类型 `number \| null`；最大 `2` | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## 实测补充参数（来源：实测）

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `user` | `—` | no | — | — | 来源：实测（Noctua，2026-07-08）；联网对照官方文档（https://api-docs.deepseek.com/zh-cn/api/create-chat-completion）检索到该参数，已补录。 |
