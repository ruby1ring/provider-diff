---
channel_id: minimax
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://platform.minimax.io/docs/api-reference/text-chat-openai"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages, max_tokens]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [temperature, top_p]
  Reasoning.Switch: [thinking, thinking.type]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Extra: [service_tier, metadata]
notes: 对照 docs/api/minimax-message.md（2026-06-25）。 类型字段按该渠道官方 API 原文收录。
---

# MiniMax Anthropic Messages API Notes


## Endpoint

| Region | HTTP |
|---|---|
| China | `POST https://api.minimaxi.com/anthropic/v1/messages` |
| International | `POST https://api.minimax.io/anthropic/v1/messages` |

## Authentication

`X-Api-Key` + `anthropic-version: 2023-06-01`  
`Content-Type: application/json`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | MiniMax-M3（多模态）或 M2.7 / M2.5 / M2.1 / M2 系列 |
| `messages` | `array` | M3 支持 text / image / video / tool / thinking；M2.x 仅 text / tool |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `system` | `string \| array` | no | — | — | 数组块支持 `cache_control` |
| `max_tokens` | `integer` | no | — | ≥ 1 | M3 推荐 131072，最大 524288；M2.x 推荐 65536，最大 204800 |
| `stream` | `boolean` | no | `false` | — | SSE 流式 |
| `temperature` | `number` | no | `1` | [0, 2] | 越界报错 |
| `top_p` | `number` | no | M3: `0.95`; M2.x: `0.9` | [0, 1] | |
| `thinking` | `object` | no | `{"type":"disabled"}` | — | M3：`disabled` / `adaptive`；省略时默认 disabled；M2.x 无法关闭 thinking |
| `thinking.type` | `string` | no | `disabled` | `disabled` \| `adaptive` | |
| `tools` | `array` | no | — | — | Anthropic 兼容 tool use |
| `tool_choice` | `object` | no | — | — | auto / any / tool / none |
| `service_tier` | `string` | no | `standard` | `standard` \| `priority` | Priority 1.5× 价格 |
| `metadata` | `object` | no | — | — | 建议含 `user_id` |

## Raw Archive

