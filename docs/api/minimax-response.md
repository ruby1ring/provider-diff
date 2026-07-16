---
channel_id: minimax
protocol_id: responses_api
doc_status: verified
doc_url: "https://platform.minimax.io/docs/api-reference/responses-create"
last_verified: 2026-07-08
compare: true
required_parameters: [model, input]
parameter_groups:
  Core: [model, input]
  Sampling: [temperature, top_p]
  Length: [max_output_tokens]
  Reasoning.Switch: [reasoning]
  Reasoning.Intensity: [reasoning.effort]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Output.Structure: [instructions, text, text.format.type]
  Extra: [service_tier, metadata, prompt_cache_key]
notes: 对照官方文档（2026-07-08）。temperature/top_p 范围 (0,1]，非 OpenAI Responses 标准，且与本渠道 chat 协议 [0,2] 不同；parallel_tool_calls/store/truncation 官方仅定义为响应字段。 类型字段按该渠道官方 API 原文收录。
---
# MiniMax Responses API Notes


## Endpoint

| Region | HTTP |
|---|---|
| China | `POST https://api.minimaxi.com/v1/responses` |
| International | `POST https://api.minimax.io/v1/responses` |

## Authentication

`Authorization: Bearer <API_KEY>`  
`Content-Type: application/json`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 如 `MiniMax-M3` 等模型名称 |
| `input` | `string \| array` | 简单文本或完整对话历史（`InputItem[]`） |

## Reasoning Control

For `MiniMax-M3`, `reasoning` controls whether the response includes reasoning output:

- 省略 `reasoning` 时默认关闭，响应不含 `type: "reasoning"` 输出项
- `reasoning: {"effort": "none"}` 为默认行为（默认 `none`），关闭 reasoning
- 官方：`minimal` / `low` / `medium` / `high` 为兼容而接受并启用推理输出，但不调节 M3 推理深度
- M2.x 无法关闭 reasoning；`effort: "none"` 可传入但 reasoning 仍开启

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `service_tier` | `string` | no | `standard` | `standard` \| `priority` | Priority 1.5× 价格 |
| `instructions` | `string` | no | — | — | 系统指令 |
| `max_output_tokens` | `integer` | no | — | — | 最大输出 token |
| `temperature` | `number` | no | `1` | (0, 1] | 采样温度。**跨协议差异**：与本渠道 Chat Completions 协议范围 [0, 2] 不同。 |
| `top_p` | `number` | no | `0.95` | (0, 1] | 核采样（Nucleus sampling）概率阈值 |
| `stream` | `boolean` | no | `false` | — | SSE 流式 |
| `reasoning` | `object` | no | `{"effort":"none"}` | — | 见上文 Reasoning Control |
| `reasoning.effort` | `string` | no | `none` | `none` \| `minimal` \| `low` \| `medium` \| `high` | |
| `tools` | `array` | no | — | — | Tool 定义列表 |
| `tool_choice` | `string` | no | — | `none` \| `auto` | |
| `metadata` | `object` | no | — | — | 键值均为 string |
| `prompt_cache_key` | `string` | no | — | — | Prompt cache 路由标识（官方 Responses 协议请求参数） |
| `text` | `object` | no | — | — | 输出格式控制 |
| `text.format.type` | `string` | no | `text` | `text` | |

### `input` array items (`InputItem`)

| Field | Type | Notes |
|---|---|---|
| `type` | `string` | `message`（默认）/ `function_call` / `function_call_output` / `reasoning` |
| `role` | `string` | `type=message` 时：`user` / `assistant` / `system` / `developer` / `tool` |
| `content` | `string \| array` | `type=message` 时；可含多模态 `ContentPart` |
| `call_id` | `string` | `function_call` / `function_call_output` |
| `name` | `string` | `function_call` 函数名 |
| `arguments` | `string` | `function_call` JSON 参数字符串 |
| `output` | `any` | `function_call_output` 工具返回 |

## Response-only Fields（官方定义为响应字段）

以下字段在官方 Responses 文档中仅定义为**响应字段**，请求 schema 未定义（来源：官方文档 https://platform.minimax.io/docs/api-reference/responses-create，2026-07-08 核对；非实测）：

| Field | Type | Notes |
|---|---|---|
| `parallel_tool_calls` | `boolean` | 仅响应字段；请求 schema 未定义。 |
| `store` | `boolean` | 仅响应字段；请求 schema 未定义。 |
| `truncation` | `string` | 仅响应字段（`disabled`）；请求 schema 未定义。 |

## Raw Archive
