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
  Reasoning.Intensity: [thinking.reasoning_effort]
  Output.Structure: [response_format]
  Tools: [tools, tool_choice, "tools[].function.strict"]
  Protocol: [stream, stream_options, stream_options.include_usage]
  Debug: [logprobs, top_logprobs]
  Metadata: [user_id]
  Beta: ["messages[].prefix", "messages[].reasoning_content"]
  Observed: [user, max_completion_tokens]
notes: 对照官方文档（2026-07-08）。frequency_penalty / presence_penalty 已 deprecated，接受但无效果；reasoning_effort 官方已移入 thinking 对象。 类型字段按该渠道官方 API 原文收录。
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
| `deepseek-v4-flash` | Documented chat model. Supports thinking and non-thinking modes. 官方 pricing 页：1M 上下文，最大输出 384K。 |
| `deepseek-v4-pro` | Documented chat model. Supports thinking and non-thinking modes. 官方 pricing 页：1M 上下文，最大输出 384K。 |
| `deepseek-chat` | 兼容别名。官方 pricing 页：「deepseek-chat 与 deepseek-reasoner 两个模型名将于北京时间 2026/07/24 23:59 弃用」，对应 `deepseek-v4-flash` 非思考模式。 |
| `deepseek-reasoner` | 兼容别名。同上弃用注记（北京时间 2026/07/24 23:59），对应 `deepseek-v4-flash` 思考模式。 |

来源：官方文档 https://api-docs.deepseek.com/zh-cn/quick_start/pricing（2026-07-08 核对）。

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
| `thinking` | `object \| null` | 思考模式控制对象：`type` 取 `enabled` / `disabled`，默认 `enabled`；官方已将 `reasoning_effort` 移入本对象（见下行）。OpenAI SDK 请通过 `extra_body` 传入。 |
| `thinking.reasoning_effort` | `string` | 推理强度：`high`、`max`。普通请求默认 `high`；复杂 Agent 请求默认 `max`。`low`/`medium` 映射为 `high`，`xhigh` 映射为 `max`。官方已将其从顶层移入 `thinking` 对象。实测：嵌套写法返回 HTTP 200 被接受（来源：实测（Noctua，2026-07-08，probe=deepseek_reasoning_effort_nested））；顶层遗留写法见「实测补充参数」。 |
| `max_tokens` | `integer \| null` | 最大补全 token 数。输入与输出合计受上下文窗口限制。官方 pricing 页：最大输出 384K（`deepseek-v4-flash` / `deepseek-v4-pro`）。 |
| `response_format` | `object \| null` | 默认 `{ "type": "text" }` 或 `{ "type": "json_object" }`。JSON 模式仍需在提示词中说明格式要求。 |
| `stop` | `string \| array<string> \| null` | 停止词，数组形式最多 16 个字符串。 |
| `stream` | `boolean \| null` | SSE 流式输出；以 `data: [DONE]` 结束。 |
| `stream_options` | `object \| null` | 仅当 `stream=true` 时生效。 |
| `stream_options.include_usage` | `boolean` | 官方原文：在 `data: [DONE]` 之前将会传输一个额外的块，含完整 `usage`，「choices 字段将始终是一个空数组」。实测：块形态**不稳定**——2026-07-08 观测到 `usage` 与 `finish_reason` 同块（merged）；2026-07-12 同日多轮观测到独立空 choices 块与 merged 两种形态交替出现。判定该行为在原厂侧即不确定，第三方渠道对照时按 P2 波动项对待（来源：实测（Noctua，2026-07-08 probe=deepseek_stream_usage_position；2026-07-12 case=deepseek_protocol_stream_usage_chunk_shape 多轮））。 |
| `temperature` | `number \| null` | 默认 `1`，最大 `2`。思考模式下接受但无效果。 |
| `top_p` | `number \| null` | 默认 `1`，最大 `1`。思考模式下接受但无效果。 |
| `tools` | `array<object> \| null` | 仅支持函数工具；最多 128 个。 |
| `tool_choice` | `string \| object \| null` | 取值 `none`、`auto`、`required` 或指定函数。无 tools 时默认 `none`，有 tools 时默认 `auto`。 |
| `tools[].function.strict` | `boolean` | 默认 `false`。Beta 严格 JSON Schema 模式。 |
| `logprobs` | `boolean \| null` | 是否返回输出 token 的对数概率。实测：思考模式下正常生效，`choices[0].logprobs` 非空（来源：实测（Noctua，2026-07-08，probe=deepseek_logprobs_thinking））。 |
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
| Strength | `thinking.reasoning_effort` = `high` / `max` | Compatibility mappings for `low`, `medium`, `xhigh`. 官方已从顶层移入 `thinking` 对象；顶层与嵌套写法实测均返回 HTTP 200 被接受（来源：实测（Noctua，2026-07-08，probe=deepseek_reasoning_effort_top_level / deepseek_reasoning_effort_nested））。 |

Thinking-mode notes:

- `temperature`, `top_p`, `presence_penalty`, `frequency_penalty` accepted but ignored.
- 官方忽略清单（temperature/top_p/presence/frequency）不含 `logprobs`；实测思考模式下 `logprobs` 正常生效，`choices[0].logprobs` 非空。来源：实测（Noctua，2026-07-08，probe=deepseek_logprobs_thinking）。
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

官方文档（原文）：`include_usage` 开启时「在 `data: [DONE]` 之前将会传输一个额外的块…choices 字段将始终是一个空数组」。

实测：块形态不稳定——2026-07-08 观测为 `merged_finish_reason`（usage 与 finish_reason 同块）；2026-07-12 同日多轮观测到 `independent`（独立空 choices 块）与 `merged_finish_reason` 交替出现，原厂行为本身不确定。来源：实测（Noctua，2026-07-08 probe=deepseek_stream_usage_position；2026-07-12 case=deepseek_protocol_stream_usage_chunk_shape 多轮复跑）。Case `deepseek_protocol_stream_usage_chunk_shape` 校验块位置；`deepseek_protocol_stream_include_usage` 仅校验 usage 字段存在。

## Test Groups

| Group | Parameters |
|---|---|
| Core | `model`, `messages` |
| Sampling | `temperature`, `top_p`, `stop` |
| Ignored | `frequency_penalty`, `presence_penalty` |
| Length | `max_tokens` |
| Reasoning | `thinking`, `thinking.reasoning_effort`, `reasoning_content` |
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

官方 schema 未声明、由边界探针验证的参数（三类边界判定见 docs/project/api-doc-update-rules.md 1.2）：

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `user` | `string` | no | — | — | 官方 schema 无此参数（仅有 `user_id`）。HTTP 200 静默接受、无可观测效果（silent_ignore）。来源：实测（Noctua，2026-07-08，probe=deepseek_user_top_level） |
| `reasoning_effort` | `string` | no | — | — | 顶层遗留写法。官方已移入 `thinking.reasoning_effort`；顶层写法 HTTP 200 仍被接受、无可观测差异。来源：实测（Noctua，2026-07-08，probe=deepseek_reasoning_effort_top_level） |
| `max_completion_tokens` | `integer` | no | — | — | 官方 schema 只有 `max_tokens`、无此参数。实测传入被静默忽略、完全不限制输出（cap=64 实际 completion_tokens=919；cap=32 实际 150）。silent_ignore。来源：实测（Noctua，2026-07-12，case=deepseek_length_max_completion_tokens_only_effective） |
