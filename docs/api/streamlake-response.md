---
channel_id: streamlake
protocol_id: responses_api
doc_status: verified
doc_url: "https://www.streamlake.com/document/WANQING/mq6k6jmxvq9ngxkozfl"
last_verified: 2026-07-08
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
notes: 对照官方文档（2026-07-08）。enable_thinking 官方标注后续将不再支持，改用 reasoning.effort（reasoning.effort 优先级更高）。 类型字段按该渠道官方 API 原文收录。
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

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `number` | no | — | [0, 2) | |
| `top_p` | `number` | no | — | (0, 1] | |
| `max_output_tokens` | `integer` | no | — | — | |
| `stream` | `boolean` | no | — | — | |
| `reasoning` | `object` | no | — | — | 推理配置；官方原文：「reasoning.effort 的优先级高于 enable_thinking」 |
| `enable_thinking` | `boolean` | no | — | — | **【Deprecated】** 官方原文：「enable_thinking 后续将不再支持」，请改用 `reasoning.effort` |
| `tools` | `array` | no | — | — | |
| `tool_choice` | `string` | no | — | — | |
| `instructions` | `string` | no | — | — | 系统级指令 |
| `previous_response_id` | `string` | no | — | — | 上下文续接；官方：有效期 7 天。与 `conversation` 不能同时使用 |
| `conversation` | `string` | no | — | — | 会话 ID。官方互斥规则：`previous_response_id` 与 `conversation` 不能同时使用 |
