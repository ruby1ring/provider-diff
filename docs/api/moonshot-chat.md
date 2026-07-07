---
channel_id: moonshot
protocol_id: chat_completions
doc_status: verified
doc_url: "https://platform.moonshot.cn/docs/api/chat"
last_verified: 2026-06-25
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, n, stop, presence_penalty, frequency_penalty]
  Length: [max_tokens, max_completion_tokens]
  Output.Structure: [response_format]
  Tools: [tools]
  Protocol: [stream, stream_options.include_usage]
  Metadata: [prompt_cache_key, safety_identifier]
notes: 对照 docs/api/moonshot-chat.md（2026-06-25）。temperature 范围 [0,1]（非 OpenAI [0,2]）；max_tokens 已弃用。 类型字段按该渠道官方 API 原文收录。
---

# Moonshot / Kimi Chat Completions API Notes


## Endpoint

| Item | Value |
|---|---|
| China | `POST https://api.moonshot.cn/v1/chat/completions` |
| Base URL | `https://api.moonshot.cn/v1` |
| Auth | `Authorization: Bearer <MOONSHOT_API_KEY>` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 必填。如 `moonshot-v1-128k`、vision-preview 系列、kimi-k2.x 等。 |
| `messages` | `array<object>` | 必填。角色：`system`、`user`、`assistant`；支持多模态内容。 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `float` | no | `0` | [0, 1] | 采样温度，值越高随机性越强。 |
| `top_p` | `float` | no | `1` | [0, 1] | 核采样概率阈值；`temperature` 与 `top_p` 建议只设其一。 |
| `n` | `integer` | no | `1` | 1–5 | 每个输入返回的候选回复数；`temperature` 接近 0 时只能为 1。 |
| `presence_penalty` | `float` | no | `0` | [-2, 2] | 存在惩罚，正值降低重复提及已出现内容。 |
| `frequency_penalty` | `float` | no | `0` | [-2, 2] | 频率惩罚，正值降低重复用词。 |
| `max_tokens` | `integer` | no | — | — | **已弃用** — 请使用 `max_completion_tokens`。 |
| `max_completion_tokens` | `integer` | no | ~1024 | — | 最大补全 token 数；超出上下文窗口会报错。 |
| `stop` | `string \| array` | no | — | 最多 5 个字符串，每个 ≤32 字节 | 停止词，命中后终止生成。 |
| `stream` | `boolean` | no | `false` | — | 是否 SSE 流式返回。 |
| `stream_options.include_usage` | `boolean` | no | `false` | — | 在 `data: [DONE]` 前输出含 usage 的最终块。 |
| `response_format` | `object` | no | `{"type":"text"}` | — | 输出格式：`text`、`json_object`、`json_schema`。 |
| `tools` | `array` | no | — | 最多 128 个 | 函数工具声明列表。 |
| `prompt_cache_key` | `string` | no | — | — | Prompt 缓存键；Kimi Code Plan 相关。 |
| `safety_identifier` | `string` | no | — | — | 哈希后的稳定用户标识，用于安全与滥用追踪。 |

## Multimodal

`messages[].content` supports `text`, `image_url`, `video_url` parts. See official docs for Partial Mode (`messages[].partial`).

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `float`；范围 `[0, 1]` | 待实测 | |
| `2` | integer | 类型 `float`；范围 `[0, 1]`（超出上界） | 待实测 | |
| `1.0` | float | 类型 `float`；范围 `[0, 1]` | 待实测 | |
| `2.0` | float | 类型 `float`；范围 `[0, 1]`（超出上界） | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## Raw Archive

