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
| `model` | `string` | 必填。如 `glm-5.2`、`glm-4.7` 等。 |
| `messages` | `array` | 必填。至少 1 条消息。 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `stream` | `boolean` | no | `false` | — | SSE 流式输出；以 `data: [DONE]` 结束。 |
| `thinking` | `object` | no | — | — | GLM-4.5+ 思考模式控制对象。 |
| `thinking.type` | `string` | no | `enabled` | `enabled` \| `disabled` | 思考模式开/关。 |
| `thinking.clear_thinking` | `boolean` | no | `true` | — | 是否清除历史 `reasoning_content`。 |
| `reasoning_effort` | `string` | no | `max` | GLM-5.2 | 推理强度：`max`、`xhigh`、`high`、`medium`、`low`、`minimal`、`none`（仅 GLM-5.2）。 |
| `do_sample` | `boolean` | no | `true` | — | 为 `false` 时忽略 `temperature`/`top_p`。 |
| `temperature` | `float` | no | `1` | [0, 1] | 采样温度；不同模型族默认值不同。 |
| `top_p` | `float` | no | `0.95` | [0.01, 1] | 核采样概率阈值。 |
| `max_tokens` | `integer` | no | — | 1–131072 | 最大输出 token；GLM-5.x/4.6 最高 128K。 |
| `tool_stream` | `boolean` | no | `false` | — | 工具调用流式输出（GLM-5.x/4.6+）。 |
| `tools` | `array` | no | — | 最多 128 个 | 工具类型：function / retrieval / web_search / mcp。 |
| `tool_choice` | `string` | no | `auto` | — | 函数工具仅支持 `auto`。 |
| `stop` | `array<string>` | no | — | 最多 4 个 | 停止词；当前仅支持单个停止词。 |
| `response_format` | `object` | no | `{"type":"text"}` | — | 输出格式：`text` 或 `json_object`。 |
| `request_id` | `string` | no | 自动生成 | 6–64 字符 | 请求追踪 ID。 |
| `user_id` | `string` | no | — | 6–128 字符 | 终端用户标识。 |

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

