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
| `model` | `string` | Qwen 系列模型名称 |
| `input` | `string \| array` | 输入文本或消息数组 |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `temperature` | `number` | 采样温度 |
| `top_p` | `number` | 核采样概率阈值 |
| `max_output_tokens` | `integer` | 最大输出 token 数 |
| `stream` | `boolean` | 是否流式返回 |
| `tools` | `array` | 百炼文档所列内置工具与函数工具 |
| `tool_choice` | `string` | 工具选择策略 |
| `reasoning.effort` | `string` | 思考强度控制 |

