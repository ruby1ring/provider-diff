---
channel_id: zhipu
protocol_id: chat_completions
doc_status: verified
doc_url: "https://open.bigmodel.cn/dev/api#glm-4"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, stop]
  Length: [max_tokens]
  Reasoning.Switch: [thinking, thinking.type]
  Reasoning.Intensity: [reasoning_effort]
  Reasoning.Output: [thinking.clear_thinking]
  Output.Structure: [response_format]
  Tools: [tools, tool_choice, tool_stream]
  Protocol: [stream, do_sample]
  Metadata: [request_id, user_id]
notes: 对照 docs/api/zhipu-chat.md（2026-06-25）。temperature 范围 [0,1]；reasoning_effort 仅 GLM-5.2。 类型字段按该渠道官方 API 原文收录。
---

# 智谱 Zhipu Chat Completions API Notes


## Endpoint

`POST https://open.bigmodel.cn/api/paas/v4/chat/completions`

## Authentication

`Authorization: Bearer <API_KEY>`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. e.g. `glm-5.2`, `glm-4.7` |
| `messages` | `array` | Required. min 1 item |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `stream` | `boolean` | no | `false` | — | SSE; ends with `data: [DONE]` |
| `thinking` | `object` | no | — | — | GLM-4.5+ thinking control |
| `thinking.type` | `string` | no | `enabled` | `enabled` \| `disabled` | |
| `thinking.clear_thinking` | `boolean` | no | `true` | — | Strip historical `reasoning_content` |
| `reasoning_effort` | `string` | no | `max` | GLM-5.2 | `max` \| `xhigh` \| `high` \| `medium` \| `low` \| `minimal` \| `none` |
| `do_sample` | `boolean` | no | `true` | — | `false` ignores temperature/top_p |
| `temperature` | `float` | no | `1` | [0, 1] | Model-family defaults vary |
| `top_p` | `float` | no | `0.95` | [0.01, 1] | |
| `max_tokens` | `integer` | no | — | 1–131072 | GLM-5.x/4.6 up to 128K |
| `tool_stream` | `boolean` | no | `false` | — | GLM-5.x/4.6+ |
| `tools` | `array` | no | — | max 128 | function / retrieval / web_search / mcp |
| `tool_choice` | `string` | no | `auto` | — | Function tools: auto only |
| `stop` | `array<string>` | no | — | max 4 | Currently single stop word |
| `response_format` | `object` | no | `{"type":"text"}` | — | `text` \| `json_object` |
| `request_id` | `string` | no | auto | 6–64 chars | |
| `user_id` | `string` | no | — | 6–128 chars | End-user identifier |

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

