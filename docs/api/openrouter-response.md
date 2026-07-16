---
channel_id: openrouter
protocol_id: responses_api
doc_status: verified
doc_url: "https://openrouter.ai/openapi.json"
last_verified: 2026-07-08
compare: true
required_parameters: [model, input]
parameter_groups:
  Core: [model, input, instructions]
  Sampling: [temperature, top_p, top_k, frequency_penalty, presence_penalty]
  Length: [max_output_tokens]
  Debug: [top_logprobs]
  Reasoning.Switch: [reasoning, reasoning.enabled]
  Reasoning.Intensity: [reasoning.effort, reasoning.max_tokens]
  Output.Structure: [text, text.verbosity]
  Output.Modality: [modalities]
  Tools: [tools, tool_choice, parallel_tool_calls, max_tool_calls]
  Protocol: [stream, background, include, truncation]
  Routing: [models, provider, plugins, session_id]
  Metadata: [store, previous_response_id, prompt, prompt_cache_key, safety_identifier, metadata, user, service_tier, cache_control]
notes: "对照官方 OpenAPI（https://openrouter.ai/openapi.json ，ResponsesRequest schema，2026-07-08）。store 为 const false（stateless 设计，只能 false）。类型字段按该渠道官方 API 原文收录。"
---
# OpenRouter Responses API API Notes


## Endpoint

`POST https://openrouter.ai/api/v1/responses`

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | |
| `input` | `string \| array` | 输入文本或消息/条目数组（`Inputs`） |

## Documented Request Parameters

来源：官方 OpenAPI `ResponsesRequest` schema（2026-07-08 抓取）。

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `double` | no | — | — | |
| `top_p` | `double` | no | — | — | |
| `top_k` | `integer` | no | — | — | |
| `frequency_penalty` | `double` | no | — | — | |
| `presence_penalty` | `double` | no | — | — | |
| `top_logprobs` | `integer` | no | — | — | |
| `max_output_tokens` | `integer` | no | — | — | |
| `max_tool_calls` | `integer` | no | — | — | 工具调用次数上限 |
| `stream` | `boolean` | no | `false` | — | |
| `background` | `boolean` | no | — | — | 后台任务开关 |
| `include` | `array` | no | — | — | 枚举：`file_search_call.results` / `message.input_image.image_url` / `computer_call_output.output.image_url` / `reasoning.encrypted_content` / `code_interpreter_call.outputs` |
| `instructions` | `string` | no | — | — | 系统级指令 |
| `store` | `boolean` | no | `false` | **const false** | 只能为 `false`（stateless 设计，不支持服务端存储） |
| `previous_response_id` | `string` | no | — | — | 上下文续接 |
| `prompt` | `object` | no | — | — | 存储的 prompt 模板：`{id（必填）, variables}` |
| `prompt_cache_key` | `string` | no | — | — | 缓存分桶键 |
| `safety_identifier` | `string` | no | — | — | 滥用防护标识 |
| `truncation` | `string` | no | — | `auto` \| `disabled` | |
| `text` | `object` | no | — | — | 文本输出配置，含 `format` 与 `verbosity`（`low` \| `medium` \| `high` \| `xhigh` \| `max`） |
| `reasoning` | `object` | no | — | — | 四字段：`effort`（`max`/`xhigh`/`high`/`medium`/`low`/`minimal`/`none`）、`summary`（`auto`/`concise`/`detailed`）、`enabled`（boolean）、`max_tokens`（integer） |
| `tools` | `array` | no | — | — | 函数工具与服务端工具 |
| `tool_choice` | `string \| object` | no | — | — | 复合类型：字符串 `auto`/`none`/`required`，或对象（named function、`web_search_preview`、`allowed_tools`、`apply_patch`、`shell` 等） |
| `parallel_tool_calls` | `boolean` | no | — | — | |
| `modalities` | `array` | no | — | — | 输出模态：`text` / `image` |
| `plugins` | `array` | no | — | — | 同 Chat Completions 的插件体系 |
| `provider` | `object` | no | — | — | 路由偏好（`ProviderPreferences`，全字段见 openrouter-chat.md） |
| `models` | `array<string>` | no | — | — | 回退路由模型列表 |
| `session_id` | `string` | no | — | ≤256 字符 | 粘性路由会话 ID；body 优先于 `x-session-id` header |
| `cache_control` | `object` | no | — | — | Anthropic 风格缓存指令 |
| `service_tier` | `string` | no | `auto` | `auto` \| `default` \| `flex` \| `priority` \| `scale` | |
| `metadata` | `object` | no | — | — | |
| `user` | `string` | no | — | ≤256 字符 | 终端用户标识 |
