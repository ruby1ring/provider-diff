---
channel_id: zhipu
protocol_id: chat_completions
doc_status: verified
doc_url: "https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, stop]
  Length: [max_tokens]
  Reasoning.Switch: [thinking, thinking.type]
  Reasoning.Intensity: [reasoning_effort]
  Reasoning.Output: [thinking.clear_thinking]
  Output.Structure: [response_format]
  Tools: [tools, tool_choice, tool_stream]
  Protocol: [stream, do_sample]
  Metadata: [request_id, user_id]
  Observed: [seed, frequency_penalty, logprobs]
notes: 对照官方文档（2026-07-08，docs.bigmodel.cn；旧 open.bigmodel.cn/dev/api 链接已 301 失效）。temperature 范围 [0,1] 限两位小数、默认值按模型系列；reasoning_effort 仅 GLM-5.2。 类型字段按该渠道官方 API 原文收录。
---

# 智谱 Zhipu Chat Completions API Notes


## Endpoint

`POST https://open.bigmodel.cn/api/paas/v4/chat/completions`

## Authentication

`Authorization: Bearer <API_KEY>`

## Models

来源：官方文档（2026-07-08 核对）。

| 类别 | Models |
|---|---|
| 文本 | `glm-5.2`（默认）、`glm-5.1`、`glm-5-turbo`、`glm-5`、`glm-4.7`、`glm-4.7-flash`、`glm-4.7-flashx`、`glm-4.6`、`glm-4.5-air`、`glm-4.5-airx`、`glm-4.5-flash`、`glm-4-flash-250414` 等 |
| 视觉 | `glm-5v-turbo`、`glm-4.6v` 系列等 |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 官方带默认值 `glm-5.2`。如 `glm-5.2`、`glm-4.7` 等，见 Models。 |
| `messages` | `array` | 必填。至少 1 条消息。 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `stream` | `boolean` | no | `false` | — | SSE 流式输出；以 `data: [DONE]` 结束。 |
| `thinking` | `object` | no | — | — | GLM-4.5+ 思考模式控制对象。官方：开启后 GLM-5.2/5.1/5/5-Turbo/5V-Turbo/4.6/4.6V/4.5 为模型自动判断是否思考；GLM-4.7、GLM-4.5V 为强制思考。 |
| `thinking.type` | `string` | no | `enabled` | `enabled` \| `disabled` | 思考模式开/关。 |
| `thinking.clear_thinking` | `boolean` | no | `true` | — | 是否清除历史 `reasoning_content`。 |
| `reasoning_effort` | `string` | no | `max` | GLM-5.2 | 推理强度：`max`、`xhigh`、`high`、`medium`、`low`、`minimal`、`none`（仅 GLM-5.2，默认 `max`）。 |
| `do_sample` | `boolean` | no | `true` | — | 官方原文：「当设置为 false 时…temperature 和 top_p 参数将被忽略」。实测传 `false` → HTTP 200 接受（来源：实测（Noctua，2026-07-08，probe=zhipu_do_sample_false））。 |
| `temperature` | `float` | no | 按系列 | [0, 1] | 限两位小数。官方默认值按系列：GLM-5.2/5.1/5/4.7/4.6 系列 `1.0`；GLM-4.5 系列 `0.6`；GLM-4 系列 `0.75`。实测 `temperature=0.123`（三位小数）→ HTTP 200 接受不报错（来源：实测（Noctua，2026-07-08，probe=zhipu_temperature_precision））。 |
| `top_p` | `float` | no | 按系列 | [0.01, 1] | 核采样概率阈值。官方默认值：GLM-4 系列 `0.9`，其余系列 `0.95`。 |
| `max_tokens` | `integer` | no | — | [1, 131072] | 最大输出 token。官方：GLM-5.x/4.7/4.6 系列最大 128K 输出；GLM-4.5 系列最大 96K。 |
| `tool_stream` | `boolean` | no | `false` | — | 工具调用流式输出（GLM-5.x/4.6+）。 |
| `tools` | `array` | no | — | 最多 128 个 | 工具类型：function / retrieval / web_search / mcp。 |
| `tool_choice` | `string` | no | `auto` | — | 函数工具仅支持 `auto`。 |
| `stop` | `array<string>` | no | — | 官方：单个停止词 | 官方原文：「目前仅支持单个停止词」。实测传 `["五","六"]` 两个停止词 → HTTP 200 且实际生效（输出止于停止词前）——文档漏洞（doc_gap），实测多停止词可用且生效。来源：实测（Noctua，2026-07-08，probe=zhipu_stop_multiple）。 |
| `response_format` | `object` | no | `{"type":"text"}` | — | 输出格式：`text` 或 `json_object`。 |
| `request_id` | `string` | no | 自动生成 | 6–64 字符 | 请求追踪 ID。 |
| `user_id` | `string` | no | — | 6–128 字符 | 终端用户标识。 |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `float`；范围 `[0, 1]` | 待实测 | |
| `2` | integer | 类型 `float`；范围 `[0, 1]`（超出上界） | 待实测 | |
| `1.0` | float | 类型 `float`；范围 `[0, 1]` | 待实测 | |
| `2.0` | float | 类型 `float`；范围 `[0, 1]`（超出上界） | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## 实测补充参数（来源：实测）

官方文档未声明、由边界探针验证的参数（三类边界判定见 docs/project/api-doc-update-rules.md 1.2）：

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `seed` | `integer` | no | — | — | 官方文档无此参数。传 `seed=42` → HTTP 200 静默接受、无可观测效果（silent_ignore）。来源：实测（Noctua，2026-07-08，probe=zhipu_seed_probe） |
| `frequency_penalty` | `float` | no | — | — | 官方文档无此参数。传 `0.5` → HTTP 200 静默接受、无可观测效果（silent_ignore）。来源：实测（Noctua，2026-07-08，probe=zhipu_frequency_penalty_probe） |
| `logprobs` | `boolean` | no | — | — | 官方文档无此参数。传 `true` → HTTP 200，但响应无 `logprobs` 字段（接受但不生效，accepted_ineffective）。来源：实测（Noctua，2026-07-08，probe=zhipu_logprobs_probe） |

## Raw Archive

