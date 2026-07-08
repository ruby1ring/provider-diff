---
channel_id: openrouter
protocol_id: responses_api
doc_status: verified
doc_url: "https://openrouter.ai/docs/api/reference/responses/overview"
last_verified: 2026-07-08
compare: true
required_parameters: [model, input]
parameter_groups:
  Core: [model, input]
  Sampling: [temperature, top_p]
  Length: [max_output_tokens]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Observed: [metadata, reasoning]
notes: 对照 docs/api/openrouter-response.md（2026-06-25）。类型字段按 OpenRouter 官方 OpenAPI 原文收录。 类型字段按该渠道官方 API 原文收录。 2026-07-08 联网对照官方文档已补录参数：metadata, reasoning。
---
# OpenRouter Responses API API Notes


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
| `temperature` | `double` | |
| `top_p` | `double` | |
| `max_output_tokens` | `integer` | |
| `stream` | `boolean` | |
| `tools` | `array` | |
| `tool_choice` | `string` | |

## 实测补充参数（来源：实测）

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `metadata` | `—` | no | — | — | 来源：实测（Noctua，2026-07-08）；联网对照官方文档（https://openrouter.ai/docs/api/reference/responses/overview）检索到该参数，已补录。 |
| `reasoning` | `—` | no | — | — | 来源：实测（Noctua，2026-07-08）；联网对照官方文档（https://openrouter.ai/docs/api/reference/responses/overview）检索到该参数，已补录。 |
