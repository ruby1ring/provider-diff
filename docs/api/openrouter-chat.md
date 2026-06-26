---
channel_id: openrouter
protocol_id: chat_completions
doc_status: verified
doc_url: "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request"
last_verified: 2026-06-25
compare: true
required_parameters: [messages]
parameter_groups:
  Core: [model, messages]
  Sampling: [temperature, top_p, top_k, frequency_penalty, presence_penalty, repetition_penalty, min_p, top_a, logit_bias, logprobs, top_logprobs]
  Reasoning.Switch: [reasoning]
  Reasoning.Intensity: [reasoning_effort]
  Routing: [models, provider, plugins, session_id]
  Tools: [parallel_tool_calls]
notes: 对照 docs/api/openrouter-chat.md（2026-06-25）。矩阵仅收录文档摘要表参数；model 可选。 类型字段按该渠道官方 API 原文收录。
---

# OpenRouter Chat Completions API Notes


## Endpoint

`POST https://openrouter.ai/api/v1/chat/completions`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `messages` | `array<object>` | Required. OpenAPI requires at least one item |
| `model` | `string` | Optional. Uses payer default model when omitted |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `messages` | `array<object>` | yes | — | min 1 | OpenAPI requires at least one item |
| `model` | `string` | no | — | — | Optional; payer default when omitted |
| `temperature` | `double` | no | `1` | [0, 2] | |
| `top_p` | `double` | no | `1` | [0, 1] | |
| `top_k` | `integer` | no | — | ≥0 | Provider-dependent |
| `frequency_penalty` | `double` | no | `0` | [-2, 2] | |
| `presence_penalty` | `double` | no | `0` | [-2, 2] | |
| `repetition_penalty` | `double` | no | `1` | — | Provider-dependent |
| `min_p` | `double` | no | — | [0, 1] | Provider-dependent |
| `top_a` | `double` | no | — | [0, 1] | Provider-dependent |
| `logit_bias` | `object` | no | — | — | Token-id → number; provider-dependent |
| `logprobs` | `boolean` | no | — | — | Output token log probabilities |
| `top_logprobs` | `integer` | no | — | [0, 20] | Requires `logprobs=true` |
| `reasoning` | `object` | no | — | — | `effort`, `summary` |
| `reasoning_effort` | `string` | no | — | — | Shorthand for `reasoning.effort` |
| `models` | `array<string>` | no | — | — | Fallback routing list |
| `provider` | `object` | no | — | — | Routing preferences |
| `plugins` | `array` | no | — | — | web_search, web_fetch, datetime |
| `session_id` | `string` | no | — | max 256 | Sticky routing |
| `parallel_tool_calls` | `boolean` | no | — | — | |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `2` | integer | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `1.0` | float | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `2.0` | float | 类型 `double`；范围 `[0, 2]` | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。
