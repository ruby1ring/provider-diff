---
channel_id: moonshot
protocol_id: chat_completions
doc_status: verified
doc_url: "https://platform.kimi.com/docs/api/chat"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, n, stop, presence_penalty, frequency_penalty]
  Length: [max_tokens, max_completion_tokens]
  Reasoning: [thinking, thinking.type, thinking.keep]
  Output.Structure: [response_format]
  Tools: [tools]
  Protocol: [stream, stream_options.include_usage]
  Metadata: [prompt_cache_key, safety_identifier]
  Observed: [user]
notes: 对照官方文档（2026-07-08，platform.kimi.com；旧 platform.moonshot.cn 已 301 迁移）。采样参数仅 moonshot-v1 系列可自定义，k2 系列固定值；temperature 范围 [0,1]（非 OpenAI [0,2]）；max_tokens 已弃用。 类型字段按该渠道官方 API 原文收录。
---
# Moonshot / Kimi Chat Completions API Notes


## Endpoint

| Item | Value |
|---|---|
| China | `POST https://api.moonshot.cn/v1/chat/completions` |
| Base URL | `https://api.moonshot.cn/v1` |
| Docs | `https://platform.kimi.com/docs/api/chat`（旧 `platform.moonshot.cn` 文档站已 301 整站迁移；API Base URL 不变） |
| Auth | `Authorization: Bearer <MOONSHOT_API_KEY>` |

## Models

来源：官方文档 https://platform.kimi.com/docs/models（2026-07-08 核对）。

| Model | Context | Thinking | Notes |
|---|---|---|---|
| `kimi-k2.7-code` | 256K | 始终开启 | `thinking:{"type":"enabled","keep":"all"}` 为默认且唯一合法组合。 |
| `kimi-k2.7-code-highspeed` | 256K | 始终开启 | `kimi-k2.7-code` 高速版。 |
| `kimi-k2.6` | 256K | 可开关 | 支持 `thinking.keep="all"`（Preserved Thinking）。 |
| `kimi-k2.5` | 256K | 可开关 | 不支持 `thinking.keep`。 |
| `moonshot-v1-8k` / `-32k` / `-128k` / `-auto` | 8K–128K | 无 | 支持全部采样参数（temperature/top_p/n/presence_penalty/frequency_penalty）。 |
| `moonshot-v1-*-vision-preview` | 8K–128K | 无 | 视觉模型；支持全部采样参数。 |

下线注记（来源：官方文档 https://platform.kimi.com/docs/models）：

- kimi-k2 系列已于 2026-05-25 下线。
- `kimi-latest` 已于 2026-01-28 下线。

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 必填。如 `kimi-k2.7-code`、`kimi-k2.6`、`kimi-k2.5`、`moonshot-v1-128k`、vision-preview 系列等（见 Models）。 |
| `messages` | `array<object>` | 必填。角色：`system`、`user`、`assistant`；支持多模态内容。 |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `float` | no | `0` | [0, 1] | 采样温度，值越高随机性越强。官方仅在 `MoonshotV1ChatRequest` schema 定义（moonshot-v1 系列）；k2 系列为固定值，指定其他值会报错，见「采样参数：模型系列差异」实测。 |
| `top_p` | `float` | no | `1` | [0, 1] | 核采样概率阈值；`temperature` 与 `top_p` 建议只设其一。官方仅 moonshot-v1 系列可自定义；k2 系列固定值，见「采样参数：模型系列差异」实测。 |
| `n` | `integer` | no | `1` | 1–5 | 每个输入返回的候选回复数；`temperature` 接近 0 时只能为 1。官方仅 moonshot-v1 系列可自定义；k2 系列固定值，见「采样参数：模型系列差异」实测。 |
| `presence_penalty` | `float` | no | `0` | [-2, 2] | 存在惩罚，正值降低重复提及已出现内容。官方仅 moonshot-v1 系列可自定义；k2 系列固定值，见「采样参数：模型系列差异」实测。 |
| `frequency_penalty` | `float` | no | `0` | [-2, 2] | 频率惩罚，正值降低重复用词。官方仅 moonshot-v1 系列可自定义；k2 系列固定值。 |
| `max_tokens` | `integer` | no | — | — | **已弃用** — 请使用 `max_completion_tokens`。 |
| `max_completion_tokens` | `integer` | no | 见 Notes | — | 最大补全 token 数；超出上下文窗口会报错。默认值官方两页描述矛盾：chat 文档称默认约 1024，K2.6 quickstart 称 `max_tokens` 默认 32768 —— 待实测（2026-07-08 未测）。 |
| `thinking` | `object` | no | 因模型而异 | — | 思考模式控制对象；约束因模型系列而异，见「Thinking 参数（按模型系列）」。 |
| `thinking.type` | `string` | no | `enabled` | `enabled` \| `disabled` | k2.7-code 仅允许 `enabled`（默认且唯一合法）；k2.6 / k2.5 可开关。 |
| `thinking.keep` | `string` | no | k2.7-code: `all` | `all` | Preserved Thinking。k2.7-code 默认且唯一合法；k2.6 可选；k2.5 不支持。 |
| `stop` | `string \| array` | no | — | 最多 5 个字符串，每个 ≤32 字节 | 停止词，命中后终止生成。 |
| `stream` | `boolean` | no | `false` | — | 是否 SSE 流式返回。 |
| `stream_options.include_usage` | `boolean` | no | `false` | — | 在 `data: [DONE]` 前输出含 usage 的最终块。 |
| `response_format` | `object` | no | `{"type":"text"}` | — | 输出格式：`text`、`json_object`、`json_schema`。 |
| `tools` | `array` | no | — | 最多 128 个 | 函数工具声明列表。 |
| `prompt_cache_key` | `string` | no | — | — | Prompt 缓存键。官方 K2.6 quickstart：Kimi Code Plan 下必填以提高缓存命中率。 |
| `safety_identifier` | `string` | no | — | — | 哈希后的稳定用户标识，用于安全与滥用追踪。 |

## Thinking 参数（按模型系列）

官方约束（来源：官方文档 https://platform.kimi.com/docs/api/chat 及 K2.6 quickstart）：

| Model | `thinking.type` | `thinking.keep` | 官方说明 |
|---|---|---|---|
| `kimi-k2.7-code` | 仅 `enabled`（默认） | `all`（默认且唯一合法） | `thinking:{"type":"enabled","keep":"all"}` 为默认且唯一合法组合，传 `disabled` 报错。 |
| `kimi-k2.6` | `enabled`（默认）/ `disabled` | `all` 可选（Preserved Thinking） | |
| `kimi-k2.5` | `enabled` / `disabled` 可开关 | 不支持 | |

实测验证：

- `kimi-k2.7-code` 传 `thinking.type="disabled"` → 400 `invalid thinking: only type=enabled is allowed for this model`。来源：实测（Noctua，2026-07-08，probe=moonshot_k27code_thinking_disabled）。
- `kimi-k2.5` 传 `thinking.keep` → 400 `thinking.keep is not supported by model "kimi-k2.5"`。来源：实测（Noctua，2026-07-08，probe=moonshot_k25_thinking_keep）。

多步工具调用时，assistant 消息中的 `reasoning_content` 必须原样回传，否则报错（来源：官方 K2.6 quickstart）。

## 采样参数：模型系列差异

官方：`temperature`、`top_p`、`n`、`presence_penalty`、`frequency_penalty` 仅在 `MoonshotV1ChatRequest` schema 定义（moonshot-v1 系列）；k2 系列为固定值，指定其他值会报错（来源：官方文档 https://platform.kimi.com/docs/api/chat 及 K2.6 quickstart）。

k2 系列实测（模型 `kimi-k2.5`，全部 400 拒绝）：

| Parameter | 传入值 | 实测 (Noctua) | 来源 |
|---|---|---|---|
| `temperature` | `0.2` | 400 `invalid temperature: only 1 is allowed for this model` | 实测（Noctua，2026-07-08，probe=moonshot_k2_temperature） |
| `top_p` | `0.5` | 400 `invalid top_p: only 0.95 is allowed for this model` | 实测（Noctua，2026-07-08，probe=moonshot_k2_top_p） |
| `n` | `2` | 400 `invalid n: only 1 is allowed for this model` | 实测（Noctua，2026-07-08，probe=moonshot_k2_n） |
| `presence_penalty` | `1` | 400 `invalid presence_penalty: only 0 is allowed for this model` | 实测（Noctua，2026-07-08，probe=moonshot_k2_presence_penalty） |

对照组：`moonshot-v1-8k` 传 `temperature=0.2` → HTTP 200 正常。来源：实测（Noctua，2026-07-08，probe=moonshot_v1_temperature_control）。

## 实测补充参数（来源：实测）

官方 schema 未声明、由边界探针验证的参数（三类边界判定见 docs/project/api-doc-update-rules.md 1.2）：

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `user` | `string` | no | — | — | 官方 schema 无此参数。HTTP 200 静默接受、无可观测效果（silent_ignore）。来源：实测（Noctua，2026-07-08，probe=moonshot_k2_user） |

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
