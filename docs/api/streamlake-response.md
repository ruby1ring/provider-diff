# StreamLake / 快手万擎 Responses API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://www.streamlake.com/document/WANQING/mq6k6jmxvq9ngxkozfl
> **Protocol ID:** `responses_api`

Structured summary for Noctua compatibility-test design.

## Endpoint

Responses API on StreamLake gateway (see official doc).

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 推理点 ID（`ep-xxx`） |
| `input` | `string \| array` | 输入 |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `temperature` | `number` | |
| `top_p` | `number` | |
| `max_output_tokens` | `integer` | |
| `stream` | `boolean` | |
| `reasoning` | `object` | 推理配置 |
| `enable_thinking` | `boolean` | 思考模式 |
| `tools` | `array` | |
| `tool_choice` | `string` | |
| `instructions` | `string` | 系统级指令 |
| `previous_response_id` | `string` | 上下文续接 |
| `conversation` | `object` | 会话管理 |
