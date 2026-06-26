---
channel_id: streamlake
protocol_id: responses_api
doc_status: verified
doc_url: "https://www.streamlake.com/document/WANQING/mq6k6jmxvq9ngxkozfl"
last_verified: 2026-06-25
compare: true
required_parameters: [model, input]
parameter_groups:
  Core: [model, input]
  Sampling: [temperature, top_p]
  Length: [max_output_tokens]
  Reasoning.Switch: [reasoning, enable_thinking]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Metadata: [instructions, previous_response_id, conversation]
notes: 对照 docs/api/streamlake-response.md（2026-06-25）。 类型字段按该渠道官方 API 原文收录。
---

# StreamLake / 快手万擎 Responses API Notes


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
