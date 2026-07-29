---
channel_id: baidu
protocol_id: chat_completions
doc_status: verified
doc_url: "https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb"
models_doc_url: "https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j"
last_verified: 2026-07-28
compare: true
required_parameters: [model, messages]
parameter_groups:
  Core: [model, "messages[].role", "messages[].content"]
  Sampling: [temperature, top_p, penalty_score, frequency_penalty, presence_penalty, repetition_penalty, seed, stop]
  Length: [max_tokens, max_completion_tokens]
  Reasoning.Switch: [thinking, "thinking.type", enable_thinking]
  Reasoning.Intensity: [thinking_budget, "thinking_strategy", reasoning_effort]
  Output.Structure: [response_format, "response_format.type", "response_format.json_schema"]
  Tools: [tools, "tools[].function.name", "tools[].function.parameters", tool_choice, parallel_tool_calls, "messages[].tool_calls", "messages[].tool_call_id"]
  Protocol: [stream, stream_options, "stream_options.include_usage", "stream_options.chunk_include_usage"]
  Search: [web_search, "web_search.enable", "web_search.search_mode", "web_search.search_number", "web_search.reference_number"]
  Metadata: [metadata, user, "messages[].name"]
notes: >
  对照千帆 OpenAI 兼容 Chat Completions 接口文档（2026-05-08 更新，2026-07-28 核对）。
  鉴权为 Bearer API Key（bce-v3 格式）。深度思考模型 max_tokens 仅限最终回答、不含思维链；
  max_completion_tokens 为总输出（含思维链），与 max_tokens 同时设置时以 max_completion_tokens 为准。
  penalty_score（默认 1.0，[1.0,2.0]）不支持 DeepSeek-V3/Reasoner/R1-Distill 系列、QwQ-32B、ERNIE X1 Turbo 系列、ERNIE 4.5 系列部分模型；
  seed 不支持 ERNIE X1 Turbo 系列、Qwen2.5、Qianfan-Agent-Intent；stop 不支持 ERNIE X1 Turbo 系列；
  response_format 不支持 ERNIE X1 Turbo 系列；GLM-Z1-Rumination-32B-0414 不支持 system 角色。
  文档未提及 top_k / n / logprobs / top_logprobs / modalities。
---
# 百度千帆 ModelBuilder v2 — OpenAI 兼容 Chat Completions API

## Endpoint

`POST https://qianfan.baidubce.com/v2/chat/completions`

base_url：`https://qianfan.baidubce.com/v2`（OpenAI SDK 仅需设置 `base_url`，路径 `/chat/completions` 由 SDK 自动拼接）。

来源：[千帆 Chat Completions API](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)（文档更新 2026-05-08）

## Authentication

- 鉴权方式：API Key
- Header：`Authorization: Bearer bce-v3/<API_Key>`
- `Content-Type: application/json`

API Key 永久有效（无需 AK/SK 换 access_token）。来源：同上。

## Required Request Fields

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `model` | `string` | yes | 预置服务参考模型列表；sft 部署服务取服务详情中的 API 名称 |
| `messages` | `array<object>` | yes | 聊天上下文，成员不能为空；1 个成员单轮，多个多轮 |
| `messages[].role` | `string` | yes | `user` \| `assistant` \| `system`（GLM-Z1-Rumination-32B-0414 不支持 system） |
| `messages[].content` | `string` \| `array` (oneOf) | yes | 不能为空；最后一个 message 的 content 不能为 blank 字符 |

## Documented Request Parameters

| Parameter | Type | Default | Range / Enum | Notes |
|---|---|---|---|---|
| `messages[].name` | `string` | — | — | message 名（可选） |
| `messages[].tool_calls` | `array` | — | — | function call 第一轮返回、第二轮作为历史传入 |
| `messages[].tool_calls[].id` | `string` | — | — | 必填，function call 唯一标识，由模型生成 |
| `messages[].tool_calls[].type` | `string` | — | 固定 `function` | 必填 |
| `messages[].tool_calls[].function.name` | `string` | — | — | 函数名 |
| `messages[].tool_calls[].function.arguments` | `string` | — | — | 函数参数 |
| `messages[].tool_call_id` | `string` | — | — | role=tool 时必填，对应 `tool_calls[].id` |
| `stream` | `boolean` | `false` | `true` \| `false` | beam search 模型只能为 false |
| `stream_options` | `object` | — | stream=true 时生效 | |
| `stream_options.include_usage` | `boolean` | `false` | `true` \| `false` | 最后一个 chunk 输出 usage |
| `stream_options.chunk_include_usage` | `boolean` | — | `true` \| `false` | 每个 chunk 都带 usage |
| `temperature` | `number` | — | 参考模型默认参数 | 较高更随机，较低更确定 |
| `top_p` | `number` | — | 参考模型默认参数 | 影响输出多样性 |
| `penalty_score` | `number` | `1.0` | `[1.0, 2.0]` | 增加惩罚减少重复。不支持 DeepSeek-V3/Reasoner/R1-Distill 系列、QwQ-32B、ERNIE X1 Turbo 系列、ERNIE 4.5 系列部分模型 |
| `max_tokens` | `integer` | — | — | 最大输出 token 数。**深度思考模型仅限制最终回答，不含思维链** |
| `max_completion_tokens` | `integer` | — | — | 总输出长度（含回答与思维链）。同时设 max_tokens 时**以本参数为准** |
| `seed` | `integer` | 空 | `(0, 2147483647)` | 确定性采样。不支持 ERNIE X1 Turbo 系列、Qwen2.5、Qianfan-Agent-Intent |
| `stop` | `array` | — | 每元素 ≤20 字符，最多 4 个元素 | 生成停止标识。不支持 ERNIE X1 Turbo 系列 |
| `frequency_penalty` | `number` | — | 参考模型默认参数 | 正值按出现频率惩罚新 token |
| `presence_penalty` | `number` | — | 参考模型默认参数 | 正值按是否出现惩罚，增加谈论新主题可能性 |
| `repetition_penalty` | `number` | — | 参考模型默认参数 | 控制连续序列重复度 |
| `tools` | `array` | — | — | 可触发函数描述列表 |
| `tools[].type` | `string` | — | `function` | 必填 |
| `tools[].function.name` | `string` | — | — | 必填 |
| `tools[].function.description` | `string` | — | — | 函数描述 |
| `tools[].function.parameters` | `object` | — | JSON Schema | 函数请求参数 |
| `tool_choice` | `string` \| `object` (oneOf) | — | `none` \| `auto` \| `required` \| 特定 function 对象 | 控制函数调用行为 |
| `parallel_tool_calls` | `boolean` | — | `true` \| `false` | 默认开启并行调用 |
| `web_search` | `object` | — | 搜索增强选项（默认不传关闭） | ernie 系列不支持 `search_mode` |
| `web_search.enable` | `boolean` | `false` | `true` \| `false` | 是否开启实时搜索 |
| `web_search.enable_citation` | `boolean` | `false` | `true` \| `false` | 是否开启上角标返回 |
| `web_search.enable_trace` | `boolean` | `false` | `true` \| `false` | 是否返回搜索溯源信息 |
| `web_search.enable_status` | `boolean` | `false` | `true` \| `false` | 是否返回搜索信号 |
| `web_search.search_mode` | `string` | — | `auto` \| `required` | 联网搜索模式（ernie 系列不支持） |
| `web_search.search_number` | `integer` | — | `[1, 28]` | 检索文献数量 |
| `web_search.reference_number` | `integer` | — | `[1, 28]`（需 ≤ search_number） | 给大模型总结的文献数量 |
| `response_format` | `object` | — | — | 不支持 ERNIE X1 Turbo 系列 |
| `response_format.type` | `string` | `text` | `json_object` \| `text` \| `json_schema` | |
| `response_format.json_schema` | `object` | — | JSON Schema | type=`json_schema` 时必填 |
| `metadata` | `map<string,string>` | — | 最多 16 个元素，key/value 均为 string | 自定义标签，用于日志遴选 |
| `thinking` | `object` | — | — | 思考模式开关 |
| `thinking.type` | `string` | `disabled` | `enabled` \| `disabled` | |
| `enable_thinking` | `boolean` | `false` | `true` \| `false` | 是否开启思考模式 |
| `thinking_budget` | `integer` | `16384` | 最小 100，最大为各模型支持值 | 思维链最大长度 |
| `thinking_strategy` | `string` | — | `short_think` \| `chain_of_draft` | 减少思维链输出 |
| `reasoning_effort` | `string` | `high` | `high` \| `max`（low/medium → high，xhigh → max） | 控制推理深度与计算强度 |
| `user` | `string` | — | — | 最终用户唯一标识符 |

### 文档未提及的参数

`top_k`、`n`、`logprobs`、`top_logprobs`、`modalities` 在该接口文档中**未出现**（不等于明确不支持，仅文档未列）。

## Streaming

- `stream=true` 时按 SSE 协议逐块返回，以 `data: [DONE]` 结束。
- delta 对象含 `role`（仅首帧）、`content`、`tool_calls`。
- usage 默认不返回；开启 `stream_options.include_usage=true` 时在最后一个 chunk 返回。
- 安全字段：`flag`（0 安全 / 1 低危 / 2 禁聊 / 3 禁止上屏 / 4 撤屏）、`ban_round`（哪轮含敏感信息，-1 为当前问题）；流式 `delta_tag`/`search_status` 表示触发搜索信号。

## Response

非流式返回 `choices` 对象（含 `message`），流式返回 `see_choices`（含 `delta`）。
- `id` / `object`（`chat.completion`）/ `created` / `model`
- `message.reasoning_content`：思维链内容（深度思考模型）
- `finish_reason`：`stop` \| `length` \| `content_filter` \| `tool_calls`
- `usage`：`prompt_tokens` / `completion_tokens` / `total_tokens`，及 `prompt_tokens_details`（`search_tokens`、`cached_tokens`；`cached_tokens` 仅 ERNIE-4.0-Turbo-8K 支持）
- `search_results`：搜索结果列表（`index`、`url`、`title`）

速率限制响应头：`X-Ratelimit-Limit-Requests` / `-Input-Tokens` / `-Output-Tokens` 与对应 `Remaining-*`。

错误响应字段：`code` / `message` / `type`。

## Models

文档未内嵌完整模型清单（指向千帆「模型列表 - 文本生成」页）。示例使用 `deepseek-v3.1-250821`。
文档注明不支持某些参数的模型族：DeepSeek-V3 / DeepSeek-Reasoner / DeepSeek-R1-Distill 系列、QwQ-32B、ERNIE X1 Turbo 系列、ERNIE 4.5 系列（ERNIE-4.5-0.3B / -21B-A3B / -VL-28B-A3B）、Qwen2.5、Qianfan-Agent-Intent、GLM-Z1-Rumination-32B-0414。

完整模型清单见 [模型列表](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j)。

## Notes

- 千帆 v2 接口对 OpenAI 标准 Chat Completions 作了若干扩展：`penalty_score`、`web_search`、`thinking_strategy`、`reasoning_effort`（仅 high/max 两档，复合映射）及流式 `flag`/`ban_round` 安全字段。
- `max_tokens`（最终回答，不含思维链）与 `max_completion_tokens`（总输出，含思维链）语义不同，同时设置以 `max_completion_tokens` 为准。
