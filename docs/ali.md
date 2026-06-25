# Aliyun Bailian / DashScope Chat Completions API Notes

> **Last verified:** 2026-06-16 against official API documentation.  
> **Official source:** https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions

Structured summary for compatibility-test design.

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

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | e.g. `qwen-plus`. Supports Qwen, Qwen-VL, Qwen-Coder, Qwen-Omni, DeepSeek, Kimi, GLM, MiniMax, etc. Third-party models may need console activation. |
| `messages` | `array<object>` | Roles: `system`, `user`, `assistant`, `tool`. Multimodal content as string or array parts. |

## Documented Request Parameters

| Parameter | Type | OpenAI standard? | Notes |
|---|---|---|---|
| `model` | `string` | yes | Required. |
| `messages` | `array<object>` | yes | Required. |
| `stream` | `boolean` | yes | Default `false`. |
| `stream_options.include_usage` | `boolean` | yes | Only when `stream=true`; last chunk includes `usage`. |
| `temperature` | `float` | yes | `[0, 2)`. Model-specific defaults vary widely. |
| `top_p` | `float` | yes | `(0, 1.0]`. |
| `top_k` | `integer \| null` | **no** | `extra_body`. `null` or `>100` disables top_k. Not supported by DeepSeek/Kimi/MiniMax series. |
| `repetition_penalty` | `float` | **no** | `extra_body`. `>0`; `1.0` = no penalty. |
| `presence_penalty` | `float` | yes | `[-2.0, 2.0]`. |
| `response_format` | `object` | yes | `{"type":"text"}` (default) or `{"type":"json_object"}`. Prompt must request JSON for json_object mode. |
| `max_tokens` | `integer` | yes | **即将废弃** — prefer `max_completion_tokens`. Does not limit thinking-chain length. |
| `max_completion_tokens` | `integer` | yes | Limits total output including thinking chain. Recommended for thinking models. Supported on Qwen3.7+/3.5+/Flash, Kimi k2.5+, GLM-5+, MiniMax-M2.5+, DeepSeek v3+ (阿里云直供, not third-party). |
| `vl_high_resolution_images` | `boolean` | **no** | `extra_body`. Raises vision pixel cap for VL models. |
| `n` | `integer` | yes | `1`–`4`. Only Qwen3 non-thinking, `qwen-plus-character`. Must be `1` when `tools` present. |
| `enable_thinking` | `boolean` | **no** | `extra_body`. Hybrid thinking for Qwen3.x, DeepSeek-V4, Kimi, GLM, etc. Returns `reasoning_content`. |
| `thinking` | `object` | **no** | `extra_body`. For 稀宇科技直供 `MiniMax/MiniMax-M3`: `{"type":"adaptive"}` (default) or `{"type":"disabled"}`. |
| `preserve_thinking` | `boolean` | **no** | `extra_body`. Replay historical `reasoning_content` into input. Model-gated. |
| `thinking_budget` | `integer` | **no** | `extra_body`. Max thinking tokens for Qwen3.x / Qwen3-VL. |
| `reasoning_effort` | `string` | **no** | `extra_body`. DeepSeek-V4 series: `high`, `max`; `low`/`medium`→`high`, `xhigh`→`max`. |
| `tool_stream` | `boolean` | **no** | `extra_body`. Only when `stream=true`. Streams complex tool `arguments`. Qwen + GLM series. |
| `enable_code_interpreter` | `boolean` | **no** | `extra_body`. Code interpreter toggle. |
| `seed` | `integer` | yes | `[0, 2^31-1]` for reproducibility. |
| `logprobs` | `boolean` | yes | Default `false`. Thinking `reasoning_content` excluded. Model-gated. |
| `top_logprobs` | `integer` | yes | `[0, 5]` when `logprobs=true`. |
| `stop` | `string \| array` | yes | Do not mix token_id and string in array. |
| `tools` | `array<object>` | yes | Function tools only. |
| `tool_choice` | `string \| object` | yes | `auto`, `none`, or forced function. Thinking models cannot force tool. |
| `parallel_tool_calls` | `boolean` | yes | Default `false`. |
| `enable_search` | `boolean` | **no** | `extra_body`. Web search toggle. |
| `search_options` | `object` | **no** | `extra_body`. `forced_search`, `search_strategy` (`turbo`, `max`, `agent`, `agent_max`), `enable_search_extension`. |
| `modalities` | `array` | yes | Qwen-Omni only: `["text"]` or `["text","audio"]`. |
| `audio` | `object` | yes | Qwen-Omni output audio; `format` only `wav`. Requires `modalities` includes `audio`. |
| `skill` | `array` | **no** | `extra_body`. Only `qwen-doc-turbo`; requires `stream=true`. Type `ppt`. |
| `X-DashScope-DataInspection` | header | — | Content safety: `{"input":"cip","output":"cip"}`. Not request body. |

Non-standard parameters (`top_k`, `repetition_penalty`, `enable_thinking`, `thinking`, `thinking_budget`, `preserve_thinking`, `reasoning_effort`, `tool_stream`, `enable_code_interpreter`, `enable_search`, `search_options`, `vl_high_resolution_images`, `skill`) should be passed via `extra_body` in OpenAI Python SDK.

## Multimodal Message Parts

`messages[].content[]` types: `text`, `image_url`, `input_audio`, `video`, `video_url`. Optional pixel controls: `min_pixels`, `max_pixels`, `total_pixels`, `fps`. Explicit cache: `cache_control.type = ephemeral`.

## Response Fields

| Field | Notes |
|---|---|
| `choices[].message.content` | Final reply. |
| `choices[].message.reasoning_content` | Thinking chain when thinking enabled. |
| `choices[].message.tool_calls` | Function calls. |
| `choices[].finish_reason` | `stop`, `length`, `tool_calls`. |
| `usage` | Token counts. |

Streaming: `chat.completion.chunk` with `delta.content`, `delta.reasoning_content`, `delta.tool_calls`, `delta.audio` (Qwen-Omni). Last chunk may carry `usage` when `include_usage=true`.

## Test Groups

| Group | Parameters |
|---|---|
| Core | `model`, `messages` |
| Protocol | `stream`, `stream_options.include_usage` |
| Sampling | `temperature`, `top_p`, `top_k`, `repetition_penalty`, `presence_penalty`, `seed`, `stop`, `n` |
| Length | `max_tokens`, `max_completion_tokens` |
| Output | `response_format`, `modalities`, `audio` |
| Vision | `image_url`, `video_url`, `vl_high_resolution_images`, pixel controls |
| Reasoning | `enable_thinking`, `thinking`, `preserve_thinking`, `thinking_budget`, `reasoning_effort` |
| Tools | `tools`, `tool_choice`, `parallel_tool_calls`, `tool_stream`, `enable_code_interpreter` |
| Debug | `logprobs`, `top_logprobs` |
| Search | `enable_search`, `search_options` |
| Header | `X-DashScope-DataInspection` |
| Skill | `skill` |

## Test Notes

- Default model `qwen-plus` for general text/sampling/tools/streaming tests.
- Capability-gated params need `requires_model_capability` in cases.
- `response_format=json_object` prompts must explicitly request JSON output.
- `max_completion_tokens` preferred over deprecated `max_tokens` for thinking models.
