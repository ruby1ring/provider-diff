---
channel_id: openrouter
protocol_id: chat_completions
doc_status: verified
doc_url: "https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request"
last_verified: 2026-06-25
compare: true
required_parameters: [messages]
parameter_groups:
  Core: [model, messages]
  Sampling: [temperature, top_p, top_k, frequency_penalty, presence_penalty, repetition_penalty, min_p, top_a, logit_bias]
  Debug: [logprobs, top_logprobs]
  Reasoning.Switch: [reasoning]
  Reasoning.Intensity: [reasoning_effort]
  Routing: [models, provider, plugins]
  Metadata: [session_id]
  Tools: [parallel_tool_calls]
notes: 对照 docs/api/openrouter-chat.md（2026-06-25）。矩阵仅收录文档摘要表参数；model 可选。 类型字段按该渠道官方 API 原文收录。
---

# OpenRouter Chat Completions API Notes


## Endpoint

`POST https://openrouter.ai/api/v1/chat/completions`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `messages` | `array<object>` | 必填。OpenAPI 要求至少一条消息。 |
| `model` | `string` | 可选；省略时使用付费方默认模型。 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `messages` | `array<object>` | yes | — | 至少 1 条 | 对话消息列表，OpenAPI 要求至少一条。 |
| `model` | `string` | no | — | — | 模型 ID；省略时使用付费方默认模型。 |
| `temperature` | `double` | no | `1` | [0, 2] | 采样温度，控制输出随机性。 |
| `top_p` | `double` | no | `1` | [0, 1] | 核采样概率阈值。 |
| `top_k` | `integer` | no | — | ≥0 | 采样候选数；取决于底层供应商。 |
| `frequency_penalty` | `double` | no | `0` | [-2, 2] | 频率惩罚，降低重复用词。 |
| `presence_penalty` | `double` | no | `0` | [-2, 2] | 存在惩罚，降低重复提及。 |
| `repetition_penalty` | `double` | no | `1` | — | 重复惩罚；取决于底层供应商。 |
| `min_p` | `double` | no | — | [0, 1] | 最小概率阈值；取决于底层供应商。 |
| `top_a` | `double` | no | — | [0, 1] | 自适应核采样；取决于底层供应商。 |
| `logit_bias` | `object` | no | — | — | token-id 到数值的偏置映射；取决于底层供应商。 |
| `logprobs` | `boolean` | no | — | — | 是否返回输出 token 的对数概率。 |
| `top_logprobs` | `integer` | no | — | [0, 20] | 每步返回 top-N 概率；需 `logprobs=true`。 |
| `reasoning` | `object` | no | — | — | 推理配置对象，含 `effort`、`summary` 等子字段。 |
| `reasoning_effort` | `string` | no | — | — | `reasoning.effort` 的简写形式。 |
| `models` | `array<string>` | no | — | — | 回退路由模型列表，主模型不可用时依次尝试。 |
| `provider` | `object` | no | — | — | 路由偏好，如供应商排序、排除列表等。 |
| `plugins` | `array` | no | — | — | 插件列表，如 web_search、web_fetch、datetime。 |
| `session_id` | `string` | no | — | 最长 256 | 粘性路由会话 ID，同会话固定后端。 |
| `parallel_tool_calls` | `boolean` | no | — | — | 是否并行发起多个工具调用。 |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `2` | integer | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `1.0` | float | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `2.0` | float | 类型 `double`；范围 `[0, 2]` | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。
