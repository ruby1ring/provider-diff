# Aliyun Bailian / DashScope Chat Completions API Notes

Source: local scrape of the Aliyun Bailian OpenAI-compatible Chat Completions API documentation.

本文档用于 `provider-diff` 的参数支持矩阵和 payload 测试设计。内容是结构化整理，不是原网页逐字镜像。

## Endpoint

中国大陆（北京）：

```http
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

国际（新加坡）：

```http
POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
```

美国（弗吉尼亚）：

```http
POST https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions
```

德国（法兰克福）：

```http
POST https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions
```

OpenAI SDK 的 `base_url` 对应为上述地址去掉 `/chat/completions` 后的部分，例如：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

百炼也提供 Anthropic-compatible Messages endpoint。该测试器使用的 Base URL 为：

```text
https://dashscope.aliyuncs.com/apps/anthropic/v1
```

后端会追加 `/messages`，最终请求为：

```http
POST https://dashscope.aliyuncs.com/apps/anthropic/v1/messages
```

## Authentication

HTTP 请求使用 Bearer token：

```http
Authorization: Bearer <DASHSCOPE_API_KEY>
Content-Type: application/json
```

Anthropic-compatible Messages endpoint 使用 Anthropic-style 请求头：

```http
X-Api-Key: <DASHSCOPE_API_KEY>
anthropic-version: 2023-06-01
Content-Type: application/json
```

## Required Request Fields

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | 必选。模型名称，例如 `qwen-plus`。文档说明支持 Qwen、Qwen-VL、Qwen-Coder、Qwen-Omni、Qwen-Math、DeepSeek、Kimi、GLM、MiniMax 等系列，但三方直供模型需要在控制台开通。 |
| `messages` | `array<object>` | 必选。按对话顺序排列的上下文。常见 role 包括 `system`、`user`、`assistant`、`tool`。 |

## Message Shape

| Field | Type | Notes |
|---|---|---|
| `messages[].role` | `string` | `system`、`user`、`assistant`、`tool`。 |
| `messages[].content` | `string \| array` | 纯文本时为 string；多模态输入或显式缓存时为 array。 |
| `messages[].content[].type` | `string` | 多模态内容类型：`text`、`image_url`、`input_audio`、`video`、`video_url`。 |
| `messages[].content[].text` | `string` | `type=text` 时的文本。 |
| `messages[].content[].image_url.url` | `string` | `type=image_url` 时的图片 URL 或 Base64 Data URL。 |
| `messages[].content[].input_audio.data` | `string` | `type=input_audio` 时的音频 URL 或 Base64 Data URL。 |
| `messages[].content[].input_audio.format` | `string` | 输入音频格式，例如 `mp3`、`wav`。 |
| `messages[].content[].video` | `array` | `type=video` 时的图片列表形式视频。 |
| `messages[].content[].video_url.url` | `string` | `type=video_url` 时的视频文件 URL 或 Base64 Data URL。 |
| `messages[].content[].fps` | `number` | 视频抽帧频率，文档给出的范围是 `[0.1, 10]`，默认 `2.0`。 |
| `messages[].content[].min_pixels` | `integer` | 多模态输入的最小像素阈值，适用于 Qwen-VL、QVQ。 |
| `messages[].content[].max_pixels` | `integer` | 多模态输入的最大像素阈值，适用于 Qwen-VL、QVQ。 |
| `messages[].content[].total_pixels` | `integer` | 限制视频抽帧后的总像素，适用于 Qwen-VL、QVQ。 |
| `messages[].content[].cache_control.type` | `string` | 显式缓存配置，目前只支持 `ephemeral`。 |
| `messages[].assistant.partial` | `boolean` | assistant 前缀续写开关，默认 `false`，需要模型支持。 |
| `messages[].assistant.tool_calls` | `array` | 上一轮 Function Calling 返回的工具调用信息。 |
| `messages[].tool.tool_call_id` | `string` | tool message 对应的工具调用 ID。 |

## Documented Request Parameters

| Parameter | Type | Compatibility Notes |
|---|---|---|
| `model` | `string` | 必选。OpenAI-compatible 字段。 |
| `messages` | `array<object>` | 必选。OpenAI-compatible 字段。 |
| `stream` | `boolean` | 是否流式输出，默认 `false`。文档建议长输出使用 `true`。 |
| `stream_options.include_usage` | `boolean` | 仅在 `stream=true` 时生效，`true` 时最后一个 chunk 包含 `usage`。 |
| `modalities` | `array` | 输出模态，仅适用于 Qwen-Omni。可选 `["text","audio"]` 或 `["text"]`，默认 `["text"]`。 |
| `audio` | `object` | 输出音频配置，仅适用于 Qwen-Omni，且 `modalities` 需为 `["text","audio"]`。`audio.format` 仅支持 `wav`。 |
| `temperature` | `float` | 采样温度，范围 `[0, 2)`。文档建议 `temperature` 与 `top_p` 只设置一个。 |
| `top_p` | `float` | 核采样阈值，范围 `(0, 1.0]`。文档建议 `temperature` 与 `top_p` 只设置一个。 |
| `top_k` | `integer \| null` | 非 OpenAI 标准参数。大于等于 `0` 的整数；设为 `null` 或大于 `100` 会禁用 `top_k` 策略。DeepSeek/Kimi/MiniMax 系列不支持。 |
| `repetition_penalty` | `float` | 非 OpenAI 标准参数。重复度惩罚，大于 `0`，`1.0` 表示不惩罚。 |
| `presence_penalty` | `float` | 控制内容重复度，范围 `[-2.0, 2.0]`。 |
| `response_format` | `object` | 默认 `{"type":"text"}`。文档只列出 `text` 与 `json_object`。使用 `json_object` 时提示词必须明确要求 JSON，否则会报错。 |
| `max_tokens` | `integer` | 限制输出最大 token 数；触发时 `finish_reason` 为 `length`。不限制思考模型的思维链长度。 |
| `vl_high_resolution_images` | `boolean` | 非 OpenAI 标准参数。提升输入图像像素上限，适用于视觉模型。 |
| `n` | `integer` | 生成响应数量，范围 `1-4`。仅支持 Qwen3 非思考模式、`qwen-plus-character`。传入 `tools` 时必须设为 `1`。 |
| `enable_thinking` | `boolean` | 非 OpenAI 标准参数。混合思考模型是否开启思考模式；开启后思考内容通过 `reasoning_content` 返回。 |
| `preserve_thinking` | `boolean` | 非 OpenAI 标准参数。是否将历史 assistant 的 `reasoning_content` 拼接进输入。默认 `false`；部分 Qwen/Kimi 模型支持。 |
| `thinking_budget` | `integer` | 非 OpenAI 标准参数。限制思考过程最大 token 数，适用于 Qwen3/Qwen3.5/Qwen3.6/Qwen3-VL 等模型。 |
| `reasoning_effort` | `string` | 非 OpenAI 标准参数。控制 DeepSeek-V4 系列推理力度。文档列出的可选值为 `high`、`max`；同时说明 `low`/`medium` 会映射到 `high`，`xhigh` 会映射到 `max`。 |
| `tool_stream` | `boolean` | 非 OpenAI 标准参数。仅在 `stream=true` 时生效，使 Function Calling 的 `arguments` 以流式增量返回。适用于 GLM 直供模型。 |
| `enable_code_interpreter` | `boolean` | 非 OpenAI 标准参数。是否开启代码解释器功能。 |
| `seed` | `integer` | 随机数种子，范围 `[0, 2^31-1]`；相同输入和参数下尽可能复现结果。 |
| `logprobs` | `boolean` | 是否返回输出 token 的对数概率，默认 `false`。思考阶段的 `reasoning_content` 不返回对数概率。仅部分模型支持。 |
| `top_logprobs` | `integer` | 范围 `[0,5]`，仅当 `logprobs=true` 时生效。 |
| `stop` | `string \| array` | 停止词。数组中不要混合 token_id 和字符串。 |
| `tools` | `array<object>` | Function Calling 工具定义。当前工具类型仅支持 `function`。 |
| `tool_choice` | `string \| object` | 默认 `auto`。支持 `auto`、`none`、以及 `{"type":"function","function":{"name":"..."}}` 强制指定工具。思考模式模型不支持强制指定工具。 |
| `parallel_tool_calls` | `boolean` | 是否开启并行工具调用，默认 `false`。 |
| `enable_search` | `boolean` | 非 OpenAI 标准参数。是否开启联网搜索，默认 `false`。 |
| `search_options` | `object` | 非 OpenAI 标准参数。仅当 `enable_search=true` 时生效。包含 `forced_search`、`search_strategy`、`enable_search_extension`。 |
| `search_options.forced_search` | `boolean` | 是否强制联网搜索，默认 `false`。 |
| `search_options.search_strategy` | `string` | 默认 `turbo`。文档列出 `turbo`、`max`、`agent`、`agent_max`，其中 `agent` 与 `agent_max` 有模型限制。 |
| `search_options.enable_search_extension` | `boolean` | 是否开启垂域搜索，仅当 `enable_search=true` 时生效，默认 `false`。 |
| `X-DashScope-DataInspection` | request header | 内容安全增强检测。HTTP 调用时放入请求头，不是 request body。可设为 `{"input":"cip","output":"cip"}`。 |
| `skill` | `array` | 非 OpenAI 标准参数。仅 `qwen-doc-turbo` 支持；使用 `skill` 时 `stream` 必须为 `true`。当前文档列出的技能类型为 `ppt`。 |

## Response Shape

非流式响应示例结构包含：

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | 本次调用唯一标识。 |
| `choices` | `array<object>` | 生成结果数组。 |
| `choices[].message.role` | `string` | 固定为 `assistant`。 |
| `choices[].message.content` | `string` | 模型回复内容。 |
| `choices[].message.reasoning_content` | `string` | 思维链内容，仅思考模型/思考模式返回。 |
| `choices[].message.refusal` | `string` | 文档说明当前固定为 `null`。 |
| `choices[].message.audio` | `object` | 文档说明当前固定为 `null`；流式 Qwen-Omni 可能在 chunk delta 中返回音频。 |
| `choices[].message.function_call` | `object` | 即将废弃，文档建议使用 `tool_calls`。 |
| `choices[].message.tool_calls` | `array<object>` | Function Calling 返回的工具调用。 |
| `choices[].finish_reason` | `string` | `stop`、`length`、`tool_calls`。 |
| `choices[].logprobs` | `object` | token 对数概率信息。 |
| `created` | `integer` | Unix 秒级时间戳。 |
| `model` | `string` | 实际使用的模型。 |
| `object` | `string` | 固定为 `chat.completion`。 |
| `service_tier` | `string` | 文档说明当前固定为 `null`。 |
| `system_fingerprint` | `string` | 文档说明当前固定为 `null`。 |
| `usage` | `object` | token 消耗信息。 |

## Streaming Chunk Shape

流式响应 chunk 包含：

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | 同一次请求的每个 chunk 使用相同 id。 |
| `object` | `string` | 固定为 `chat.completion.chunk`。 |
| `choices` | `array<object>` | 当 `stream_options.include_usage=true` 时，最后一个 chunk 的 `choices` 为空数组。 |
| `choices[].delta.content` | `string` | 增量文本。 |
| `choices[].delta.reasoning_content` | `string` | 增量思维链内容。 |
| `choices[].delta.audio` | `object` | Qwen-Omni 输出音频，包含 Base64 音频数据等字段。 |
| `choices[].delta.tool_calls` | `array<object>` | 流式 Function Calling 工具调用增量。 |
| `choices[].finish_reason` | `string \| null` | 未结束时为 `null`；结束可为 `stop`、`length`、`tool_calls`。 |
| `usage` | `object \| null` | 仅在 `include_usage=true` 的最后一个 chunk 中返回。 |

## Function Calling

`tools` 中当前只支持 `function`：

| Field | Type | Notes |
|---|---|---|
| `tools[].type` | `string` | 固定为 `function`。 |
| `tools[].function.name` | `string` | 仅允许字母、数字、下划线和短横线，最长 64 个 Token。 |
| `tools[].function.description` | `string` | 工具描述，帮助模型判断何时调用。 |
| `tools[].function.parameters` | `object` | JSON Schema；可为空对象 `{}`。 |
| `tool_choice` | `string \| object` | `auto`、`none`、或强制指定某个 function。 |
| `choices[].message.tool_calls[].function.arguments` | `string` | JSON 字符串，需要调用方自行校验。 |

## Minimal Request Example

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-plus",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "你是谁？"}
    ]
  }'
```

## Test Design Implications

建议按以下组构造 payload：

| Group | Parameters |
|---|---|
| Basic | `model`、`messages` |
| Protocol | `stream`、`stream_options.include_usage` |
| Sampling | `temperature`、`top_p`、`top_k`、`repetition_penalty`、`presence_penalty`、`seed`、`stop`、`n` |
| Length | `max_tokens` |
| Output | `response_format`、`modalities`、`audio` |
| Vision / Multimodal | `image_url`、`input_audio`、`video_url`、`min_pixels`、`max_pixels`、`total_pixels`、`vl_high_resolution_images` |
| Reasoning | `enable_thinking`、`preserve_thinking`、`thinking_budget`、`reasoning_effort` |
| Tools | `tools`、`tool_choice`、`parallel_tool_calls`、`tool_stream`、`enable_code_interpreter` |
| Debug | `logprobs`、`top_logprobs` |
| Search | `enable_search`、`search_options` |
| Header / Safety | `X-DashScope-DataInspection` |
| Skill | `skill` |

测试注意点：

- 默认模型使用 `qwen-plus`，只覆盖常规文本、采样、工具、流式、结构化输出等通用路径。
- `modalities`、`audio`、`vl_high_resolution_images`、`n>1`、`enable_thinking`、`thinking_budget`、`preserve_thinking`、`reasoning_effort`、`tool_stream`、`enable_code_interpreter`、`logprobs`、`top_logprobs`、`skill` 等需要特定模型或能力，应在 case 中标记 `requires_model_capability`。
- 当前本地文档只说明 `audio.voice` 必填，没有列出可选音色值，因此 payload 目录暂不构造 `audio` case，避免引入未文档化值。
- `top_k=null` 是文档明确说明的禁用策略，不属于未文档化探针。
- `response_format={"type":"json_object"}` 的测试 prompt 必须明确要求输出 JSON。
- `X-DashScope-DataInspection` 是 header，不应放入 JSON request body。
- 真实测试应验证参数是否被接受、HTTP 状态、基础响应结构和关键字段，不应断言生成文本完全一致。
