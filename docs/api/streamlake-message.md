---
channel_id: streamlake
protocol_id: anthropic_messages
doc_status: verified
doc_url: "https://www.streamlake.com/document/WANQING/mq6k6xfnbs4vn99zggq"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages, max_tokens]
parameter_groups:
  Core: [model, messages, max_tokens, system]
  Sampling: [stop_sequences]
  Reasoning.Switch: [thinking]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Metadata: [metadata, cache_control, service_tier]
  Extra: [container, inference_geo, output_config]
notes: 对照官方文档（2026-07-08）。官方无顶层 temperature/top_p/top_k 请求参数，temperature 已废弃、由 output_config 替代。实测复核需要控制台推理点 ID（ep-xxx），2026-07-08 无可用推理点未实测（待实测）。 类型字段按该渠道官方 API 原文收录。
---
# StreamLake / 快手万擎 Anthropic Messages API Notes


## Endpoint

Anthropic-compatible Messages endpoint on StreamLake gateway (see official doc).

## Authentication

`X-Api-Key` or Bearer per gateway doc + `anthropic-version: 2023-06-01`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 推理点 ID（`ep-xxx`） |
| `messages` | `array` | role + content |
| `max_tokens` | `number` | 最大输出 token |

## Documented Request Parameters

### 基础

| Parameter | Type | Notes |
|---|---|---|
| `system` | `string \| array` | 系统提示，优先级高于 messages 内 system |

### 输出控制

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `stream` | `boolean` | `false` | SSE 流式 |
| `stop_sequences` | `array` | — | 自定义停止序列 |

### 思考推理

| Parameter | Type | Notes |
|---|---|---|
| `thinking` | `object` | 扩展思考模式，三种类型见下方子表 |

#### `thinking` variants

| `type` | Fields | Notes |
|---|---|---|
| `enabled` | `budget_tokens`、`type`、`display` | `ThinkingConfigEnabled`：固定预算扩展思考，含 `display` 字段 |
| `disabled` | `type` | 关闭思考 |
| `adaptive` | `type`、`display` | 自适应思考 |

### 工具调用

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `tools` | `array` | — | 工具定义 |
| `tool_choice` | `object` | `auto` | auto / any / tool / none |

### 其他

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `metadata` | `object` | — | 官方原文：可包含 `user_id` 用于追踪请求，不超过 64KB。`user_id` 是 `metadata.user_id`，**不是**顶层参数 |
| `cache_control` | `object` | — | `type: ephemeral`，可选 `ttl` |
| `container` | `string` | — | 跨请求容器标识 |
| `inference_geo` | `string` | — | 推理地理区域 |
| `output_config` | `object` | — | `effort` / `format`；官方原文：推荐用于替代已废弃的 `temperature` 参数 |
| `service_tier` | `string` | `auto` | `auto` / `standard_only` |

### 采样参数说明（官方口径）

官方文档无顶层 `temperature` / `top_p` / `top_k` 请求参数；`temperature` 已废弃，官方推荐使用 `output_config` 替代（原文：「推荐用于替代已废弃的 temperature 参数」）。

> 实测复核需要控制台推理点 ID（ep-xxx）；2026-07-08 无可用推理点，未实测（待实测）。
