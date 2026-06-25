# 智谱 Zhipu Chat Completions API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://open.bigmodel.cn/dev/api#glm-4
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.


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

## Raw Archive

Full OpenAPI export: [`docs/archive/zhipu-chat-raw.md`](../archive/zhipu-chat-raw.md)
