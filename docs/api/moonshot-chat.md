---
channel_id: moonshot
protocol_id: chat_completions
doc_status: verified
doc_url: "https://platform.moonshot.cn/docs/api/chat"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, n, stop, presence_penalty, frequency_penalty]
  Length: [max_tokens, max_completion_tokens]
  Output.Structure: [response_format]
  Tools: [tools]
  Protocol: [stream, stream_options.include_usage]
  Metadata: [prompt_cache_key, safety_identifier]
notes: 对照 docs/api/moonshot-chat.md（2026-06-25）。temperature 范围 [0,1]（非 OpenAI [0,2]）；max_tokens 已弃用。 类型字段按该渠道官方 API 原文收录。
---

# Moonshot / Kimi Chat Completions API Notes


## Endpoint

| Item | Value |
|---|---|
| China | `POST https://api.moonshot.cn/v1/chat/completions` |
| Base URL | `https://api.moonshot.cn/v1` |
| Auth | `Authorization: Bearer <MOONSHOT_API_KEY>` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. e.g. `moonshot-v1-128k`, vision-preview variants, kimi-k2.x |
| `messages` | `array<object>` | Required. Roles: `system`, `user`, `assistant`; multimodal content supported |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `float` | no | `0` | [0, 1] | Higher = more random |
| `top_p` | `float` | no | `1` | [0, 1] | Nucleus sampling; adjust temperature or top_p, not both |
| `n` | `integer` | no | `1` | 1–5 | Completions per input; near-zero temperature limits to 1 |
| `presence_penalty` | `float` | no | `0` | [-2, 2] | |
| `frequency_penalty` | `float` | no | `0` | [-2, 2] | |
| `max_tokens` | `integer` | no | — | — | **Deprecated** — use `max_completion_tokens` |
| `max_completion_tokens` | `integer` | no | ~1024 | — | Exceeding context window → error |
| `stop` | `string \| array` | no | — | max 5 strings, ≤32 bytes each | |
| `stream` | `boolean` | no | `false` | — | SSE streaming |
| `stream_options.include_usage` | `boolean` | no | `false` | — | Final usage chunk before `[DONE]` |
| `response_format` | `object` | no | `{"type":"text"}` | — | `text`, `json_object`, `json_schema` |
| `tools` | `array` | no | — | max 128 | Function tools |
| `prompt_cache_key` | `string` | no | — | — | Prompt caching / Kimi Code Plan |
| `safety_identifier` | `string` | no | — | — | Hashed stable user id |

## Multimodal

`messages[].content` supports `text`, `image_url`, `video_url` parts. See official docs for Partial Mode (`messages[].partial`).

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `float`；范围 `[0, 1]` | 待实测 | |
| `2` | integer | 类型 `float`；范围 `[0, 1]`（超出上界） | 待实测 | |
| `1.0` | float | 类型 `float`；范围 `[0, 1]` | 待实测 | |
| `2.0` | float | 类型 `float`；范围 `[0, 1]`（超出上界） | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## Raw Archive

