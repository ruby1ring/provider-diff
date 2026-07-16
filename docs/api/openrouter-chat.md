---
channel_id: openrouter
protocol_id: chat_completions
doc_status: verified
doc_url: "https://openrouter.ai/openapi.json"
last_verified: 2026-07-08
compare: true
required_parameters: [messages]
parameter_groups:
  Core: [model, messages]
  Sampling: [temperature, top_p, top_k, frequency_penalty, presence_penalty, repetition_penalty, min_p, top_a, logit_bias, seed, stop]
  Length: [max_tokens, max_completion_tokens]
  Debug: [logprobs, top_logprobs]
  Reasoning.Switch: [reasoning]
  Reasoning.Intensity: [reasoning.effort, reasoning_effort]
  Output.Structure: [response_format]
  Output.Modality: [modalities]
  Tools: [tools, tool_choice, parallel_tool_calls]
  Protocol: [stream, stream_options.include_usage]
  Routing: [models, provider, plugins, route, session_id]
  Metadata: [user, metadata, service_tier, cache_control]
  Observed: [transforms, verbosity]
notes: "参数以官方 OpenAPI（https://openrouter.ai/openapi.json ，ChatRequest schema）为准；参数说明页 https://openrouter.ai/docs/api/reference/parameters 。旧 doc_url（docs/api/api-reference/chat/send-chat-completion-request）已 404 失效。required 仅 messages。Observed 组为实测补充。类型字段按该渠道官方 API 原文收录。"
---

# OpenRouter Chat Completions API Notes


## Endpoint

`POST https://openrouter.ai/api/v1/chat/completions`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `messages` | `array<object>` | 必填。OpenAPI 要求至少一条消息（minItems 1）。 |
| `model` | `string` | 可选；省略时使用付费方默认模型。可带变体后缀（见下方「特殊路由与参数处理逻辑」）。 |

## Documented Request Parameters

来源：官方 OpenAPI `ChatRequest` schema（https://openrouter.ai/openapi.json ，2026-07-08 抓取）。required 仅 `messages`。

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `messages` | `array<object>` | yes | — | minItems 1 | 对话消息列表。 |
| `model` | `string` | no | — | — | 模型 ID；省略时使用付费方默认模型。 |
| `temperature` | `double` | no | `1` | [0, 2] | 采样温度，控制输出随机性。 |
| `top_p` | `double` | no | `1` | [0, 1] | 核采样概率阈值。 |
| `top_k` | `integer` | no | — | — | schema 描述：1 表示总是选最可能的 token；并非所有 provider 支持。下界口径不一（参数说明页 ≥0 vs schema 描述以 1 为最小语义值），实测见下方实测补充段。 |
| `frequency_penalty` | `double` | no | `0` | [-2, 2] | 频率惩罚，降低重复用词。 |
| `presence_penalty` | `double` | no | `0` | [-2, 2] | 存在惩罚，降低重复提及。 |
| `repetition_penalty` | `double` | no | `1` | — | 重复惩罚；1.0 表示无惩罚；并非所有 provider 支持。 |
| `min_p` | `double` | no | — | [0, 1] | 相对最高概率 token 的最小概率阈值；并非所有 provider 支持。 |
| `top_a` | `double` | no | — | [0, 1] | 自适应核采样；并非所有 provider 支持。 |
| `logit_bias` | `object` | no | — | — | token-id 到数值（double）的偏置映射。 |
| `logprobs` | `boolean` | no | — | — | 是否返回输出 token 的对数概率。 |
| `top_logprobs` | `integer` | no | — | [0, 20] | 每步返回 top-N 概率；需 `logprobs=true`。 |
| `max_tokens` | `integer` | no | — | — | **Deprecated** — 请用 `max_completion_tokens`。官方原文：「some providers enforce a minimum of 16」。 |
| `max_completion_tokens` | `integer` | no | — | — | 最大补全 token 数。 |
| `stop` | `string \| array<string>` | no | — | max 4 | 停止序列，最多 4 个。 |
| `seed` | `integer` | no | — | — | 确定性输出随机种子。 |
| `stream` | `boolean` | no | `false` | — | 启用流式响应。 |
| `stream_options.include_usage` | `boolean` | no | — | — | **Deprecated** — 官方原文：「This field has no effect. Full usage details are always included.」（usage 恒返回）。 |
| `tools` | `array` | no | — | — | 函数工具声明列表（`ChatFunctionTool`）。 |
| `tool_choice` | `string \| object` | no | — | — | 工具选择策略（字符串或指定工具对象，`ChatToolChoice`）。 |
| `response_format` | `object` | no | — | — | 五种 `type`：`text` / `json_object` / `json_schema` / `grammar` / `python`；其中 `grammar` 与 `python` 为 OpenRouter 渠道特有。 |
| `user` | `string` | no | — | — | 唯一终端用户标识。 |
| `metadata` | `object` | no | — | max 16 对 | key ≤64 字符、value ≤512 字符。 |
| `modalities` | `array` | no | — | — | 输出模态：`text` / `image` / `audio`。 |
| `service_tier` | `string` | no | — | `auto` \| `default` \| `flex` \| `priority` \| `scale` | 处理层级。 |
| `cache_control` | `object` | no | — | — | Anthropic 风格缓存指令（`AnthropicCacheControlDirective`）。 |
| `route` | `string` | no | — | `fallback` \| `sort` | **Deprecated** — 官方原文：「Use providers.sort.partition instead. Accepts legacy values: "fallback" (maps to "model"), "sort" (maps to "none").」 |
| `session_id` | `string` | no | — | ≤256 字符 | 粘性路由会话 ID：同 session 路由到同一 provider 以最大化缓存命中；body 与 `x-session-id` header 同时提供时以 body 优先。 |
| `models` | `array<string>` | no | — | — | 回退路由模型列表，主模型不可用时依次尝试。 |
| `provider` | `object` | no | — | — | 路由偏好；全字段见下方 provider 子表。 |
| `plugins` | `array` | no | — | — | 插件列表；id 枚举见下方 plugins 说明。 |
| `reasoning` | `object` | no | — | — | 推理配置对象，含 `effort`、`summary`。 |
| `reasoning.effort` | `string` | no | — | `max` \| `xhigh` \| `high` \| `medium` \| `low` \| `minimal` \| `none` | 推理强度。 |
| `reasoning.summary` | `string` | no | — | `auto` \| `concise` \| `detailed` | 推理摘要详略。 |
| `reasoning_effort` | `string` | no | — | 同 `reasoning.effort` 枚举 | `reasoning.effort` 的简写；官方原文：与 `reasoning.effort` 同时给出且值不同时不可用（Cannot be used simultaneously with reasoning.effort if they differ）。 |
| `parallel_tool_calls` | `boolean` | no | — | — | 是否并行发起多个工具调用。 |

### `provider` 对象全字段（`ProviderPreferences`）

| Field | Type | Default | Notes |
|---|---|---|---|
| `order` | `array` | — | 有序 provider slug 列表，依次尝试。 |
| `allow_fallbacks` | `boolean` | `true` | 主 provider（或 order 内自定义 provider）不可用时是否使用次优 provider；false 时直接返回上游错误。 |
| `require_parameters` | `boolean` | `false` | **⚠ 渠道测评必测点**：官方原文——省略或 false 时「providers will receive only the parameters they support, and ignore the rest」（provider 只收到它支持的参数，其余静默丢弃）；true 时只路由到支持请求中全部参数的 provider。 |
| `data_collection` | `string` | `allow` | `allow` / `deny`；deny 时只用不留存用户数据的 provider。 |
| `only` | `array` | — | 仅允许的 provider slug 列表（与账户级设置合并）。 |
| `ignore` | `array` | — | 排除的 provider slug 列表（与账户级设置合并）。 |
| `quantizations` | `array` | — | 按量化等级过滤 provider。 |
| `sort` | `string \| object` | — | 排序策略：字符串 `price` / `throughput` / `latency` / `exacto`，或对象 `{by, partition}`（`partition`: `model`（默认）/ `none`）。设置后关闭负载均衡。 |
| `max_price` | `object` | — | 愿付最高价（USD / 百万 token）：`prompt` / `completion` / `request` / `image` / `audio`。 |
| `zdr` | `boolean` | — | true 时仅路由 Zero Data Retention 端点。 |
| `enforce_distillable_text` | `boolean` | — | true 时仅路由允许文本蒸馏的模型。 |
| `preferred_max_latency` | `object` | — | 最大延迟阈值；不达标端点被降权（移到列表末尾）而非排除。 |
| `preferred_min_throughput` | `object` | — | 最小吞吐阈值；不达标端点被降权而非排除。 |

### `plugins`

`plugins[].id` 枚举（OpenAPI discriminator）：`auto-router` / `context-compression` / `file-parser` / `fusion` / `moderation` / `pareto-router` / `response-healing` / `web-fetch` / `web`。

- `datetime` 插件已改为服务端工具写法：`tools: [{"type": "openrouter:datetime"}]`（不再是 plugin id）。
- `context-compression`：上下文 ≤8k（8,192 token）的 endpoint 默认启用；可传 `plugins: [{"id": "context-compression", "enabled": false}]` 关闭。

### `transforms`（已从官方 schema 移除）

官方 OpenAPI 已整体移除 `transforms` 参数：`middle-out` 能力迁移至 `plugins` 的 `context-compression`（engine 仍名为 `middle-out`）。来源：官方 Message Transforms 文档与 openapi.json（2026-07-08 抓取）。实测传 `transforms: ["middle-out"]` 仍被接受（向后兼容），见下方实测补充段。

## 实测补充参数（来源：实测）

实测模型 `deepseek/deepseek-v4-flash`，2026-07-08（注：`openai/gpt-4o-mini` 在当前区域 403 不可用，未能作为对照模型）。

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `transforms` | `array<string>` | no | — | — | 官方 OpenAPI 已整体移除；传 `["middle-out"]` → HTTP 200 仍被接受（向后兼容，silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=or_transforms_legacy） |
| `route` | `string` | no | — | — | 官方标注 Deprecated；传旧值 `"fallback"` → HTTP 200 接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=or_route_legacy） |
| `verbosity` | `string` | no | — | — | 参数说明页有、ChatRequest schema 无（官方文档自相矛盾）；传 `"low"` → HTTP 200 接受（silent_ignore，生效性未验证）。来源：实测（Noctua，2026-07-08，probe=or_verbosity_probe） |
| `top_k=0` | `integer` | — | — | — | top_k 下界官方口径不一（0 vs 1）；传 `0` → HTTP 200 接受（生效性未验证）。来源：实测（Noctua，2026-07-08，probe=or_top_k_zero） |
| `stream_options.include_usage=false` | `boolean` | — | — | — | 传 `false` 时最终块 usage 仍返回，与官方「always included」一致。来源：实测（Noctua，2026-07-08，probe=or_stream_usage_false） |

## 特殊路由与参数处理逻辑（官方文档）

来源：OpenRouter 官方文档 Provider Selection / Reasoning Tokens / Message Transforms（2026-07-08 抓取；索引 https://openrouter.ai/docs/llms.txt ）。

- **默认负载均衡（价格加权）三步**：(1) 优先近 30 秒内无明显故障的 provider；(2) 在稳定 provider 中按价格平方反比加权随机选择低成本候选（$1 vs $3 → 被选概率 9:1）；(3) 其余 provider 作为 fallback。设置 `provider.sort` 或 `provider.order` 后负载均衡关闭。
- **参数感知路由**：带 `tools` / `tool_choice` 的请求只会路由到支持工具调用的 provider；设置 `max_tokens` 时只路由到支持该输出长度的 provider。
- **`require_parameters` 默认 false**（⚠ 渠道测评必测点）：默认情况下 provider 只收到它支持的参数、其余参数被静默丢弃——即 2xx 不代表参数生效；设为 true 才保证参数全支持。
- **模型变体后缀**：`:thinking`（扩展推理）、`:nitro`（等价 `provider.sort="throughput"`）、`:floor`（等价 `provider.sort="price"`）、`:free`、`:online`、`:extended`、`:exacto`。
- **reasoning effort→budget 百分比映射**：`max` / `xhigh` ≈95%、`high` ≈80%、`medium` ≈50%、`low` ≈20%、`minimal` ≈10%（相对 max_tokens）、`none` 关闭推理。Anthropic 系模型：`budget_tokens = max(min(max_tokens × effort_ratio, 128000), 1024)`。

## 实测：temperature 字面量

对应测评 case 分组「协议 / 采样」：`temperature` 分别传入 JSON integer `1`、`2` 与 float `1.0`、`2.0`。

| 传入值 | JSON 类型 | 官方文档 | 实测 (Noctua) | 备注 |
|---|---|---|---|---|
| `1` | integer | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `2` | integer | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `1.0` | float | 类型 `double`；范围 `[0, 2]` | 待实测 | |
| `2.0` | float | 类型 `double`；范围 `[0, 2]` | 待实测 | |

> 实测与文档不一致时，在「实测」列记录 HTTP 状态、错误码或实际行为；勿改写「官方文档」列。
