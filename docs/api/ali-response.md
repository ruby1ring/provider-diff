---
channel_id: aliyun
protocol_id: responses_api
doc_status: verified
doc_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses"
last_verified: 2026-07-08
compare: true
required_parameters: [model, input]
parameter_groups:
  Core: [model, input, instructions]
  Sampling: [temperature, top_p]
  Reasoning.Switch: [enable_thinking]
  Reasoning.Intensity: [reasoning.effort]
  Tools: [tools, tool_choice]
  Protocol: [stream]
  Metadata: [conversation, previous_response_id, store]
  Extra: [ocr_options]
  Observed: [max_output_tokens, parallel_tool_calls]
notes: 对照官方文档（2026-07-08）。官方总则：「请求将仅处理本文档明确列出的参数，任何未提及的 OpenAI 参数都会被忽略」「不支持 background（当前仅支持同步调用）」。Observed 组为实测补充。 类型字段按该渠道官方 API 原文收录。
---
# 阿里云百炼 Responses API API Notes


## Compatibility

官方总则原文：「请求将仅处理本文档明确列出的参数，任何未提及的 OpenAI 参数都会被忽略」；「不支持 background（当前仅支持同步调用）」。

## Endpoint

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/responses`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Qwen 系列模型名称 |
| `input` | `string \| array` | 输入文本或消息数组 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `number` | no | — | — | 采样温度 |
| `top_p` | `number` | no | — | — | 核采样概率阈值 |
| `stream` | `boolean` | no | — | — | 是否流式返回 |
| `instructions` | `string` | no | — | — | 系统级指令（可选） |
| `conversation` | `string` | no | — | — | 会话 ID，用于会话管理 |
| `previous_response_id` | `string` | no | — | — | 上一次响应 ID，用于上下文续接 |
| `store` | `boolean` | no | `true` | — | 是否存储本次响应 |
| `enable_thinking` | `boolean` | no | — | — | 思考模式开关 |
| `reasoning.effort` | `string` | no | `medium` | — | 思考强度控制 |
| `ocr_options` | `object` | no | — | — | OCR 相关配置 |
| `tools` | `array` | no | — | — | 百炼文档所列内置工具与函数工具 |
| `tool_choice` | `string` | no | — | — | 工具选择策略 |

> `max_output_tokens`：官方最新文档未列出此参数（存量文档曾收录）；实测行为见下方实测补充段。

## 实测补充参数（来源：实测）

实测环境：美国区 `dashscope-us.aliyuncs.com`，模型 `qwen3.6-flash`，2026-07-08；中国区账号欠费未测。

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `max_output_tokens` | `integer` | no | — | — | 官方最新文档未列出。请求传入 → HTTP 200 接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=ali_responses_max_output_tokens） |
| `parallel_tool_calls` | `boolean` | no | — | — | 官方两次抓取口径不一（请求参数 vs 仅响应字段）。请求传入 → HTTP 200 接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=ali_responses_parallel_tool_calls） |
