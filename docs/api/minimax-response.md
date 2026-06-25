# MiniMax Responses API Notes

> **Last verified:** 2026-06-16 against official API documentation.
> **Official source:** https://platform.minimax.io/docs/api-reference/text-chat-openai
> **Protocol ID:** `responses_api`

Structured summary for Noctua compatibility-test design.

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
| `model` | `string` | e.g. `MiniMax-M3` |
| `input` | `string \| array` | 简单文本或完整对话历史（`InputItem[]`） |

## Reasoning Control

For `MiniMax-M3`, `reasoning` controls whether the response includes reasoning output:

- 省略 `reasoning` 时默认关闭，响应不含 `type: "reasoning"` 输出项
- `reasoning: {"effort": "none"}` 为默认行为，关闭 reasoning
- `minimal` / `low` / `medium` / `high` 为兼容值，会启用 reasoning，但不调节 M3 推理深度
- M2.x 无法关闭 reasoning；`effort: "none"` 可传入但 reasoning 仍开启

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `service_tier` | `string` | no | `standard` | `standard` \| `priority` | Priority 1.5× 价格 |
| `instructions` | `string` | no | — | — | 系统指令 |
| `max_output_tokens` | `integer` | no | — | — | 最大输出 token |
| `temperature` | `number` | no | `1` | (0, 1] | 采样温度 |
| `top_p` | `number` | no | `0.95` | (0, 1] | Nucleus sampling |
| `stream` | `boolean` | no | `false` | — | SSE 流式 |
| `reasoning` | `object` | no | `{"effort":"none"}` | — | 见上文 Reasoning Control |
| `reasoning.effort` | `string` | no | `none` | `none` \| `minimal` \| `low` \| `medium` \| `high` | |
| `tools` | `array` | no | — | — | Tool 定义列表 |
| `tool_choice` | `string` | no | — | `none` \| `auto` | |
| `metadata` | `object` | no | — | — | 键值均为 string |
| `prompt_cache_key` | `string` | no | — | — | Prompt cache 路由标识 |
| `text` | `object` | no | — | — | 输出格式控制 |
| `text.format.type` | `string` | no | `text` | `text` | |
| `parallel_tool_calls` | `boolean` | no | — | — | 是否支持并行 tool call |
| `store` | `boolean` | no | — | — | 是否持久化响应 |
| `truncation` | `string` | no | — | `disabled` | 上下文截断策略 |

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

## Raw Archive

[`docs/archive/minimax-response-raw.md`](../archive/minimax-response-raw.md)
