# 阿里云百炼 Responses API API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses
> **Protocol ID:** `responses_api`

Structured summary for Noctua compatibility-test design.


## Compatibility

Only parameters listed in official Bailian Responses docs are processed; unlisted OpenAI params are ignored. `background` (async) not supported.

## Endpoint

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/responses`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Qwen series |
| `input` | `string \| array` | Text or message array |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `temperature` | `number` | |
| `top_p` | `number` | |
| `max_output_tokens` | `integer` | |
| `stream` | `boolean` | |
| `tools` | `array` | Built-in + function tools per Bailian docs |
| `tool_choice` | `string` | |
| `reasoning.effort` | `string` | Thinking strength control |

Raw user notes: [`docs/archive/ali-response-raw.md`](../archive/ali-response-raw.md)
