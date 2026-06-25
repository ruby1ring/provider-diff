# StreamLake / 快手万擎 Anthropic Messages API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://www.streamlake.com/document/WANQING/mq6k6xfnbs4vn99zggq
> **Protocol ID:** `anthropic_messages`

Structured summary for Noctua compatibility-test design.

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
| `thinking` | `object` | Extended Thinking：`enabled` / `disabled` / `adaptive` 等 |

### 工具调用

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `tools` | `array` | — | 工具定义 |
| `tool_choice` | `object` | `auto` | auto / any / tool / none |

### 其他

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `metadata` | `object` | — | 含 `user_id`，≤64KB |
| `cache_control` | `object` | — | `type: ephemeral`，可选 `ttl` |
| `container` | `string` | — | 跨请求容器标识 |
| `inference_geo` | `string` | — | 推理地理区域 |
| `output_config` | `object` | — | `effort` / `format`；可替代 temperature |
| `service_tier` | `string` | `auto` | `auto` / `standard_only` |
