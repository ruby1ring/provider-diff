# StreamLake / 快手万擎 Chat Completions API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://www.streamlake.com/document/WANQING/mq6k66r6xgqwnfbd8t
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.

## Endpoint

`POST https://wanqing.streamlakeapi.com/api/gateway/v1/endpoints/{ep-id}/chat/completions`

`model` 为推理点 ID（`ep-xxx`），非模型版本名。

## Authentication

`Authorization: Bearer <API_KEY>`  
`Content-Type: application/json`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 推理点 ID，如 `ep-b0cx22-...` |
| `messages` | `array` | System / User / Assistant / Tool 消息 |

## Documented Request Parameters

### 输出控制

| Parameter | Type | Default | Range | Notes |
|---|---|---|---|---|
| `stream` | `boolean` | `false` | — | 推荐 `true` 降低超时风险 |
| `stream_options` | `object` | — | — | 仅 `stream=true`；`include_usage` 默认 false |
| `modalities` | `array` | `["text"]` | — | Qwen-Omni：`["text","audio"]` |
| `audio` | `object` | — | — | 需 `modalities` 含 `audio` |
| `max_completion_tokens` | `integer` | — | — | 推荐使用 |
| `max_tokens` | `integer` | — | — | **Deprecated** |
| `n` | `integer` | `1` | 1–4 | 仅部分 Qwen3 / qwen-plus-character |
| `response_format` | `object` | `{"type":"text"}` | — | `text` / `json_object` / `json_schema` |
| `stop` | `string \| array` | — | — | 停止词 |

### 生成质量控制

| Parameter | Type | Default | Range | Notes |
|---|---|---|---|---|
| `temperature` | `float` | — | [0, 2) | 与 `top_p` 建议只设其一 |
| `top_p` | `float` | — | (0, 1.0] | |
| `top_k` | `integer` | — | ≥0 | Python SDK 放 `extra_body` |
| `presence_penalty` | `float` | — | [-2.0, 2.0] | |
| `seed` | `integer` | — | [0, 2^31-1] | 可复现采样 |

### 概率输出

| Parameter | Type | Default | Range | Notes |
|---|---|---|---|---|
| `logprobs` | `boolean` | `false` | — | |
| `top_logprobs` | `integer` | `0` | [0, 5] | 需 `logprobs=true` |

### 思考推理

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `enable_thinking` | `boolean` | 因模型 | 混合思考模型；SDK 放 `extra_body` |

### 工具调用

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `tools` | `array` | — | Function Calling |
| `tool_choice` | `string \| object` | `auto` | `auto` / `none` / `required` |
| `parallel_tool_calls` | `boolean` | `false` | |
