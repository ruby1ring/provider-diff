---
channel_id: minimax
protocol_id: chat_completions
doc_status: verified
doc_url: "https://platform.minimax.io/docs/api-reference/text-chat-openai"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p]
  Length: [max_completion_tokens, max_tokens]
  Reasoning.Switch: [thinking, thinking.type]
  Reasoning.Output: [reasoning_split]
  Tools: [tools]
  Protocol: [stream, stream_options.include_usage]
  Extra: [service_tier]
notes: 对照 docs/api/minimax-chat.md（2026-06-25）。 类型字段按该渠道官方 API 原文收录。
---

# MiniMax Chat Completions API Notes


## Endpoint

| Region | Endpoint |
|---|---|
| China | `POST https://api.minimaxi.com/v1/chat/completions` |
| International | `POST https://api.minimax.io/v1/chat/completions` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | MiniMax-M3, M2.7, M2.5, M2.1, M2 variants |
| `messages` | `array<object>` | Text / image / video / tool content |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `thinking` | `object` | no | `{"type":"adaptive"}` | — | M3 on/off; M2.x cannot disable |
| `thinking.type` | `string` | no | `adaptive` | `adaptive` \| `disabled` | M3 only for `disabled` |
| `reasoning_split` | `boolean` | no | — | — | Output format only; does not toggle thinking |
| `stream` | `boolean` | no | `false` | — | |
| `stream_options.include_usage` | `boolean` | no | `false` | — | |
| `max_completion_tokens` | `integer` | no | — | M3: rec 131072, max 524288; M2.x: rec 65536, max 204800 | |
| `max_tokens` | `integer` | no | — | — | **Deprecated** |
| `temperature` | `number` | no | `1` | [0, 2] | Out-of-range → error |
| `top_p` | `number` | no | M3: `0.95`; M2.x: `0.9` | [0, 1] | |
| `tools` | `array` | no | — | — | Use `tools`, not `function_call` |
| `service_tier` | `string` | no | `standard` | `standard` \| `priority` | Priority 1.5× price |

### Ignored / unsupported (official SDK guide)

| Parameter | Behavior |
|---|---|
| `presence_penalty` | Ignored |
| `frequency_penalty` | Ignored |
| `logit_bias` | Ignored |
| `function_call` | Unsupported; use `tools` |
| `n` | Only `1` supported |
| Audio input | Not supported via OpenAI-compatible API |

### Not in OpenAPI

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `number`；范围 `[0, 2]` | 待实测 | |
| `2` | integer | 类型 `number`；范围 `[0, 2]` | 待实测 | |
| `1.0` | float | 类型 `number`；范围 `[0, 2]` | 待实测 | |
| `2.0` | float | 类型 `number`；范围 `[0, 2]` | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## Raw Archive

