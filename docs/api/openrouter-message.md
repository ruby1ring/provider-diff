---
channel_id: openrouter
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://openrouter.ai/openapi.json"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [temperature, top_p, top_k, stop_sequences]
  Reasoning.Switch: [thinking]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Routing: [models, fallbacks, provider, route, trace, stop_server_tools_when]
  Metadata: [session_id]
  Extra: [output_config, metadata, user, cache_control, plugins, service_tier, context_management, speed]
notes: "参数以官方 OpenAPI（https://openrouter.ai/openapi.json ，MessagesRequest schema，2026-07-08）为准；旧 doc_url（docs/api/api-reference/anthropic-messages/create-messages）已 404 失效。官方 required 仅 model、messages（max_tokens 可选）。类型字段按该渠道官方 API 原文收录。"
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
| `max_tokens` | `integer` | no | — | — | 最大输出 token（官方 schema 未列为 required） |
| `temperature` | `number` | no | — | — | 采样温度（Anthropic 兼容语义） |
| `top_p` | `number` | no | — | — | |
| `top_k` | `integer` | no | — | — | |
| `stop_sequences` | `array<string>` | no | — | — | |
| `stream` | `boolean` | no | — | — | |
| `thinking` | `object` | no | — | — | 扩展思考模式配置；三种类型见下方 `thinking` 子表 |
| `tools` | `array` | no | — | — | |
| `tool_choice` | `object` | no | — | — | |
| `output_config` | `object` | no | — | — | 结构化输出 |
| `metadata` | `object` | no | — | — | |
| `user` | `string` | no | — | max 256 | 终端用户标识 |
| `service_tier` | `string` | no | — | — | |
| `cache_control` | `object` | no | — | — | Prompt 缓存策略 |
| `context_management` | `object` | no | — | — | |
| `speed` | `string` | no | `standard` | `fast` \| `standard` | 官方原文：`fast` 使用更高速推理配置、溢价计费（premium pricing）；缺省为 `standard`。 |

### `thinking` variants（官方 OpenAPI MessagesRequest.thinking）

| `type` | Fields | Notes |
|---|---|---|
| `enabled` | `budget_tokens`（integer，**必填**）、`display`（可选） | 固定预算扩展思考 |
| `disabled` | — | 关闭思考 |
| `adaptive` | `display`（可选） | 自适应思考——**新增类型**（含 `display` 字段，2026-07-08 schema） |

### OpenRouter extensions

| Parameter | Type | Notes |
|---|---|---|
| `models` | `array<string>` | 多模型路由列表；不可与 `fallbacks` 同用 |
| `fallbacks` | `array` | 主模型失败/拒答时依次尝试，最多 3 项，每项仅 `model`（per-attempt 覆盖会被拒绝）；不可与 `models` 同用 |
| `provider` | `object` | 路由偏好（order / only / ignore 等） |
| `plugins` | `array` | web、web-fetch 等插件（datetime 已改服务端工具写法） |
| `session_id` | `string` | 粘性路由会话 ID，≤256 字符；与请求头 `x-session-id` 冲突时以 body 为准 |
| `route` | `string` | **Deprecated** — 官方原文：「Use providers.sort.partition instead. Accepts legacy values: "fallback" (maps to "model"), "sort" (maps to "none").」 |
| `trace` | `object` | 追踪配置 |
| `stop_server_tools_when` | `object` | 服务端工具停止条件 |

## Raw OpenAPI Archive

