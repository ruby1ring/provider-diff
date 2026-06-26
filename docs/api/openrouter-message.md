---
channel_id: openrouter
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://openrouter.ai/docs/api/api-reference/anthropic-messages/create-messages"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages, max_tokens]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [temperature, top_p, top_k, stop_sequences]
  Reasoning.Switch: [thinking]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Routing: [models, fallbacks, provider, session_id, route, trace, stop_server_tools_when]
  Extra: [output_config, metadata, user, cache_control, plugins, service_tier, context_management, speed]
notes: 对照 docs/api/openrouter-message.md（2026-06-25）。 类型字段按该渠道官方 API 原文收录。
---

# OpenRouter Anthropic Messages API Notes


## Endpoint

`POST https://openrouter.ai/api/v1/messages`

## Authentication

`Authorization: Bearer <OPENROUTER_API_KEY>`

Optional header `X-OpenRouter-Metadata: enabled` — 在响应中返回 `openrouter_metadata` 路由信息。

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 主路由模型 |
| `messages` | `array` | Anthropic Messages 格式 |

## Documented Request Parameters

### Core & sampling

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `system` | `string \| array` | no | — | — | 系统提示 |
| `max_tokens` | `integer` | no | — | — | 最大输出 token |
| `temperature` | `number` | no | — | — | Anthropic 兼容 |
| `top_p` | `number` | no | — | — | |
| `top_k` | `integer` | no | — | — | |
| `stop_sequences` | `array<string>` | no | — | — | |
| `stream` | `boolean` | no | — | — | |
| `thinking` | `object` | no | — | — | Extended thinking |
| `tools` | `array` | no | — | — | |
| `tool_choice` | `object` | no | — | — | |
| `output_config` | `object` | no | — | — | 结构化输出 |
| `metadata` | `object` | no | — | — | |
| `user` | `string` | no | — | max 256 | 终端用户标识 |
| `service_tier` | `string` | no | — | — | |
| `cache_control` | `object` | no | — | — | Prompt caching |
| `context_management` | `object` | no | — | — | |
| `speed` | `string` | no | — | — | Anthropic speed 档位 |

### OpenRouter extensions

| Parameter | Type | Notes |
|---|---|---|
| `models` | `array<string>` | 多模型路由列表；不可与 `fallbacks` 同用 |
| `fallbacks` | `array` | 主模型失败时依次尝试，最多 3 项，每项仅 `model` |
| `provider` | `object` | 路由偏好（order / only / ignore 等） |
| `plugins` | `array` | web_search、web_fetch、datetime 等 |
| `session_id` | `string` | Sticky routing，≤256 字符；与 header `x-session-id` 冲突时 body 优先 |
| `route` | `any` | 路由控制 |
| `trace` | `object` | 追踪配置 |
| `stop_server_tools_when` | `object` | 服务端工具停止条件 |

## Raw OpenAPI Archive

