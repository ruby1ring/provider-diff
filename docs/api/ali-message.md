# 阿里云百炼 Anthropic Messages API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://help.aliyun.com/zh/model-studio/anthropic-api-messages
> **Protocol ID:** `anthropic_messages`

Structured summary for Noctua compatibility-test design.

## Endpoint

| Region | HTTP |
|---|---|
| 华北2 | `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/apps/anthropic/v1/messages` |
| 新加坡 | `POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1/messages` |
| 美国 | `POST https://dashscope-us.aliyuncs.com/apps/anthropic/v1/messages` |

## Authentication

`x-api-key` 或 `Authorization: Bearer <DASHSCOPE_API_KEY>`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Qwen / DeepSeek / Kimi / GLM / MiniMax 等 |
| `messages` | `array` | `user` / `assistant` 交替；不含 `system` 角色 |
| `max_tokens` | `integer` | 回复上限；不限制 thinking token（由 `thinking.budget_tokens` 控制） |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `system` | `string \| array` | no | — | — | 顶层传入；数组形式支持 `cache_control` |
| `stream` | `boolean` | no | `false` | — | |
| `temperature` | `number` | no | — | [0, 2) | **注意**：非 Anthropic 官方 [0,1] |
| `top_p` | `number` | no | — | — | 与 temperature 建议只设其一 |
| `top_k` | `integer` | no | — | — | |
| `stop_sequences` | `array` | no | — | — | 命中后 `stop_reason` 仍为 `end_turn` |
| `thinking` | `object` | no | — | — | `enabled` / `disabled` |
| `thinking.budget_tokens` | `integer` | no | — | — | `type=enabled` 时生效 |
| `reasoning_effort` | `string` | no | `max` | `high` \| `max` | DeepSeek-V4 系列；low/medium→high，xhigh→max |
| `tools` | `array` | no | — | — | Function Call |
| `tool_choice` | `object` | no | `auto` | auto / any / none / tool | |
| `output_config` | `object` | no | — | — | 结构化输出；deepseek/glm 严格 schema |

## Raw Archive

[\`docs/archive/ali-message-raw.md\`](../archive/ali-message-raw.md)
