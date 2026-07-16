---
channel_id: aliyun
protocol_id: chat_completions
doc_status: verified
doc_url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions"
last_verified: 2026-07-08
compare: true
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, top_k, repetition_penalty, presence_penalty, seed, stop, n]
  Length: [max_tokens, max_completion_tokens]
  Reasoning.Switch: [enable_thinking, thinking]
  Reasoning.Intensity: [thinking_budget, reasoning_effort]
  Reasoning.Output: [preserve_thinking, clear_thinking]
  Output.Structure: [response_format]
  Output.Modality: [modalities, vl_high_resolution_images, audio]
  Tools: [tools, tool_choice, parallel_tool_calls, tool_stream, enable_code_interpreter]
  Protocol: [stream, stream_options.include_usage]
  Debug: [logprobs, top_logprobs]
  Search: [enable_search, search_options]
  Extra: [skill, X-DashScope-DataInspection]
  Observed: [user, service_tier, frequency_penalty, logit_bias]
notes: 对照官方文档（2026-07-08）。含百炼 extra_body 与搜索扩展参数；Observed 组为实测补充（官方文档未定义）。 类型字段按该渠道官方 API 原文收录。
---
# 阿里云百炼 Chat Completions API Notes


## Endpoints

| Region | Base URL | Chat completions |
|---|---|---|
| 华北2（北京） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `POST .../chat/completions` |
| 新加坡 | `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` | same |
| 美国（弗吉尼亚） | `https://dashscope-us.aliyuncs.com/compatible-mode/v1` | same |
| 德国（法兰克福） | `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1` | same |
| 日本（东京） | `https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/compatible-mode/v1` | same |

Singapore migration note: prefer workspace URL `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` over legacy `https://dashscope-intl.aliyuncs.com`.

Anthropic Messages (separate protocol):

```text
https://dashscope.aliyuncs.com/apps/anthropic/v1
```

## Authentication

```http
Authorization: Bearer <DASHSCOPE_API_KEY>
Content-Type: application/json
```

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | 必填。百炼平台 Qwen 及第三方模型名称。 |
| `messages` | `array<object>` | 必填。角色 `system`、`user`、`assistant`、`tool`；支持多模态内容。 |

## Documented Request Parameters

| Parameter | Type | OpenAI? | Default | Range | Notes |
|---|---|---|---|---|---|
| `stream` | `boolean` | yes | `false` | — | 非流式超时 300s；长输出建议开启流式。 |
| `stream_options.include_usage` | `boolean` | yes | `false` | — | 仅当 `stream=true` 时生效；最后一个 chunk 附带 usage。 |
| `temperature` | `float` | yes | 因模型而异 | [0, 2) | 采样温度；各模型默认值见官方文档。 |
| `top_p` | `float` | yes | 因模型而异 | (0, 1.0] | 核采样概率阈值。 |
| `top_k` | `integer \| null` | **no** | 因模型而异 | ≥0；null 或 >100 表示不启用 | 通过 `extra_body` 传入；DeepSeek/Kimi/MiniMax 不支持。 |
| `repetition_penalty` | `float` | **no** | 因模型而异 | >0；1.0 表示无惩罚 | 重复惩罚，通过 `extra_body` 传入。 |
| `presence_penalty` | `float` | yes | 因模型而异 | [-2, 2] | 存在惩罚，控制内容重复度。 |
| `response_format` | `object` | yes | `{"type":"text"}` | — | 输出格式：`text` 或 `json_object`。 |
| `max_tokens` | `integer` | yes | — | — | **即将废弃** — 推荐使用 `max_completion_tokens`。 |
| `max_completion_tokens` | `integer` | yes | — | — | 最大补全 token，含思维链；思考模型推荐使用。 |
| `vl_high_resolution_images` | `boolean` | **no** | `false` | — | 视觉语言模型高分辨率图像；通过 `extra_body` 传入。 |
| `n` | `integer` | yes | `1` | 1–4 | 生成候选数；存在 `tools` 时必须为 1。 |
| `enable_thinking` | `boolean` | **no** | 因模型而异 | — | 混合思考模式开关；通过 `extra_body` 传入。适用面：Qwen3.7 Max/Plus 系列混合思考默认开；Qwen3 商业版（qwen-max 等）默认关；开源版默认开；仅思考模型（qwq-plus、deepseek-r1 等）无法关闭。 |
| `thinking` | `object` | **no** | `{"type":"adaptive"}` | — | MiniMax 系列：默认 `{"type":"adaptive"}`（自适应）或 `disabled`。 |
| `preserve_thinking` | `boolean` | **no** | `false` | — | 多轮对话是否保留历史思考内容；通过 `extra_body` 传入。 |
| `clear_thinking` | `boolean` | **no** | `false` | — | 仅 GLM 系列：控制历史轮 `reasoning_content` 是否纳入上下文。 |
| `thinking_budget` | `integer` | **no** | 模型的最大思维链长度 | — | 思考 token 预算；Qwen3.x / Qwen3-VL。默认值来源：https://help.aliyun.com/zh/model-studio/deep-thinking |
| `reasoning_effort` | `string` | **no** | `high` | DeepSeek-V4 及 GLM 系列 | 推理强度：`high` 或 `max`；含兼容映射。 |
| `tool_stream` | `boolean` | **no** | `false` | — | 工具调用流式输出；通过 `extra_body` 传入，仅流式。 |
| `enable_code_interpreter` | `boolean` | **no** | `false` | — | 代码解释器；通过 `extra_body` 传入。 |
| `seed` | `integer` | yes | 因模型而异 | [0, 2^31-1] | 随机种子，用于可复现采样。 |
| `logprobs` | `boolean` | yes | `false` | — | 返回对数概率；思考的 `reasoning_content` 不计入。 |
| `top_logprobs` | `integer` | yes | `0` | [0, 5] | 每步返回 top-N 概率；需 `logprobs=true`。 |
| `stop` | `string \| array` | yes | — | — | 停止词；数组中勿混用 token_id 与字符串。 |
| `tools` | `array` | yes | — | — | 函数工具声明列表。 |
| `tool_choice` | `string \| object` | yes | `auto` | — | 工具选择策略；思考模型无法强制调用工具。 |
| `parallel_tool_calls` | `boolean` | yes | `false` | — | 是否并行发起多个工具调用。 |
| `enable_search` | `boolean` | **no** | `false` | — | 联网搜索；通过 `extra_body` 传入。 |
| `search_options` | `object` | **no** | — | — | 搜索配置；通过 `extra_body` 传入。 |
| `modalities` | `array` | yes | `["text"]` | — | 输出模态；Qwen-Omni：`["text","audio"]`。 |
| `audio` | `object` | yes | — | — | Qwen-Omni 输出音频配置；`format`：`wav`。 |
| `skill` | `array` | **no** | — | — | 仅 `qwen-doc-turbo` PPT 技能；需 `stream=true`。 |
| `X-DashScope-DataInspection` | header | — | — | — | 内容安全检测请求头，非 body 字段。 |

## extra_body Parameters

Non-standard parameters (`top_k`, `repetition_penalty`, `enable_thinking`, `thinking`, `thinking_budget`, `preserve_thinking`, `clear_thinking`, `reasoning_effort`, `tool_stream`, `enable_code_interpreter`, `enable_search`, `search_options`, `vl_high_resolution_images`, `skill`) should be passed via `extra_body`

## Multimodal Message Parts

`messages[].content[]` types: `text`, `image_url`, `input_audio`, `video`, `video_url`. Optional pixel controls: `min_pixels`, `max_pixels`, `total_pixels`, `fps`. Explicit cache: `cache_control.type = ephemeral`.

## 实测补充参数（来源：实测）

以下参数官方文档均无定义，为隐性参数三类边界探针结果。实测环境：美国区 `dashscope-us.aliyuncs.com`，模型 `qwen3.6-flash`，2026-07-08；中国区账号欠费未测。

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `user` | `string` | no | — | — | 官方文档未定义。HTTP 200 静默接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=ali_user_probe） |
| `service_tier` | `string` | no | — | — | 官方仅作为响应字段，请求参数未定义。HTTP 200 静默接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=ali_service_tier_probe） |
| `frequency_penalty` | `number` | no | — | — | 官方文档确认无此参数。传 `0.5` → HTTP 200 静默接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=ali_frequency_penalty_probe） |
| `logit_bias` | `object` | no | — | — | 官方文档确认无此参数。HTTP 200 静默接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=ali_logit_bias_probe） |

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `float`；范围 `[0, 2)` | 待实测 | |
| `2` | integer | 类型 `float`；范围 `[0, 2)`（上界不含 2） | 待实测 | |
| `1.0` | float | 类型 `float`；范围 `[0, 2)` | 待实测 | |
| `2.0` | float | 类型 `float`；范围 `[0, 2)`（上界不含 2） | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。

## Source

Structured from user-supplied `ali-chat` (2026-06-25) + prior `ali.md` endpoint/multimodal notes. 2026-07-08 对照官方最新文档补充 `clear_thinking`、`reasoning_effort` 适用模型、`thinking`/`thinking_budget` 默认值、`enable_thinking` 适用面，并新增实测补充参数段。
