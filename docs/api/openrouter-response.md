# OpenRouter Responses API API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://openrouter.ai/docs/api/reference/responses/overview
> **Protocol ID:** `responses_api`

Structured summary for Noctua compatibility-test design.


## Endpoint

`POST https://openrouter.ai/api/v1/responses`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | |
| `input` | `string \| array` | |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `temperature` | `number` | |
| `top_p` | `number` | |
| `max_output_tokens` | `integer` | |
| `stream` | `boolean` | |
| `tools` | `array` | |
| `tool_choice` | `string` | |

Raw OpenAPI: [`docs/archive/openrouter-response-raw.openapi.md`](../archive/openrouter-response-raw.openapi.md)
