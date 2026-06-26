---
channel_id: aliyun
protocol_id: responses_api
doc_status: verified
doc_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses"
last_verified: 2026-06-25
compare: true
required_parameters: [model, input]
parameter_groups:
  Core: [model, input]
  Sampling: [temperature, top_p]
  Length: [max_output_tokens]
  Reasoning.Intensity: [reasoning.effort]
  Tools: [tools, tool_choice]
  Protocol: [stream]
notes: 对照 docs/api/ali-response.md（2026-06-25）。仅文档化参数生效；background 异步不支持。 类型字段按该渠道官方 API 原文收录。
---

# 阿里云百炼 Responses API API Notes


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

