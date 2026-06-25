# SiliconFlow Anthropic Messages API Notes

> **Last verified:** 2026-06-16 against official API documentation (browser + OpenAPI).
> **Official source:** https://docs.siliconflow.cn/cn/api-reference/chat-completions/messages
> **Protocol ID:** `anthropic_messages`

Structured summary for Noctua compatibility-test design.

## Endpoint

| Region | HTTP |
|---|---|
| China | `POST https://api.siliconflow.cn/v1/messages` |
| International | `POST https://api.siliconflow.com/v1/messages` |

## Authentication

`Authorization: Bearer <API_KEY>`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 见 [Models](https://cloud.siliconflow.cn/models?types=chat) |
| `messages` | `array` | min 1，max 10；`user` / `assistant` 交替（Anthropic 惯例） |

> OpenAPI 未将 `max_tokens` 标为 required，但 Anthropic Messages 语义上应提供输出上限。

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `messages[].role` | `string` | yes | `user` | `user` \| `system` \| `assistant` | |
| `messages[].content` | `string` | yes | — | — | 消息内容 |
| `system` | `string \| array` | no | — | — | 系统提示；数组项为 `RequestTextBlock` |
| `max_tokens` | `integer` | no | — | — | 生成上限；模型各有最大值 |
| `stream` | `boolean` | no | — | — | SSE；以 `data: [DONE]` 结束 |
| `temperature` | `number` | no | — | [0, 2] | |
| `top_p` | `number` | no | — | [0.1, 1] | |
| `top_k` | `number` | no | — | [0, 50] | |
| `stop_sequences` | `array<string>` | no | — | — | 命中后 `stop_reason=stop_sequence` |
| `tools` | `array` | no | — | — | Anthropic tool use |
| `tools[].name` | `string` | yes | — | — | 工具名称 |
| `tools[].description` | `string` | no | — | — | 强烈建议提供 |
| `tools[].input_schema` | `object` | yes | — | — | JSON Schema（draft 2020-12） |
| `tool_choice` | `object` | no | — | — | 见下方子类型 |

### `tool_choice` variants

| `type` | Fields | Notes |
|---|---|---|
| `auto` | `disable_parallel_tool_use` (boolean, default false) | 模型自动决定是否调用工具 |
| `none` | — | 禁止工具 |
| `tool` | `name`, `disable_parallel_tool_use` | 强制指定工具 |

### `system` text block (`RequestTextBlock`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `string` | yes | `text` |
| `text` | `string` | yes | 文本内容 |

## Response Fields

| Field | Notes |
|---|---|
| `id`, `type=message`, `role=assistant`, `content[]` | Anthropic Messages 响应 |
| `content[].type` | `text` / `tool_use` / `thinking` 等 |
| `stop_reason` | `end_turn`, `max_tokens`, `stop_sequence`, `tool_use` |
| `usage.input_tokens` / `output_tokens` | Token 用量 |
| Header `x-siliconcloud-trace-id` | 请求追踪 ID |

## Raw Archive

[`docs/archive/siliconflow-message-raw.md`](../archive/siliconflow-message-raw.md)
