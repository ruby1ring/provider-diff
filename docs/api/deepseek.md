---
channel_id: deepseek
protocol_id: chat_completions
doc_status: verified
doc_url: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion"
last_verified: 2026-06-16
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
notes: 对照 docs/api/deepseek.md（2026-06-16）。frequency_penalty / presence_penalty 已 deprecated，接受但无效果。 类型字段按该渠道官方 API 原文收录。
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
| `model` | `string` | Required. Documented values: `deepseek-v4-flash`, `deepseek-v4-pro`. |
| `messages` | `array<object>` | Required. At least one message. Roles: `system`, `user`, `assistant`, `tool`. |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. |
| `messages` | `array<object>` | Required. |
| `thinking` | `object \| null` | `{"type":"enabled"}` or `{"type":"disabled"}`. Default `enabled`. Use `extra_body` in OpenAI SDK. |
| `reasoning_effort` | `string` | `high`, `max`. Default `high` for ordinary requests; complex agent requests may auto-use `max`. `low`/`medium` → `high`, `xhigh` → `max`. |
| `max_tokens` | `integer \| null` | Max completion tokens. Input + output limited by context window. |
| `response_format` | `object \| null` | `{ "type": "text" }` (default) or `{ "type": "json_object" }`. JSON mode still needs prompt instructions. |
| `stop` | `string \| array<string> \| null` | Up to 16 strings in array form. |
| `stream` | `boolean \| null` | SSE stream; ends with `data: [DONE]`. |
| `stream_options` | `object \| null` | Only when `stream=true`. |
| `stream_options.include_usage` | `boolean` | Extra pre-`[DONE]` chunk with full `usage` and empty `choices`. |
| `temperature` | `number \| null` | Default `1`, max `2`. In thinking mode accepted but no effect. |
| `top_p` | `number \| null` | Default `1`, max `1`. In thinking mode accepted but no effect. |
| `tools` | `array<object> \| null` | Function tools only; max 128 functions. |
| `tool_choice` | `string \| object \| null` | `none`, `auto`, `required`, or named function. Default `none` without tools, `auto` with tools. |
| `tools[].function.strict` | `boolean` | Default `false`. Beta strict JSON-schema mode. |
| `logprobs` | `boolean \| null` | Return output token log probabilities. |
| `top_logprobs` | `integer \| null` | `0`–`20`; requires `logprobs=true`. |
| `user_id` | `string \| null` | `[a-zA-Z0-9\-_]`, max 512. Used for safety, KVCache isolation, scheduling. |
| `frequency_penalty` | deprecated | No effect. |
| `presence_penalty` | deprecated | No effect. |

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
