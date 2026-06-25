# SiliconFlow Chat Completions API Notes

> **Last verified:** 2026-06-16 against official API documentation.  
> **Official source:** https://api-docs.siliconflow.cn/docs/api/chat-completions-post

Supplementary: https://api-docs.siliconflow.cn/docs/userguide/capabilities/multimodal-vision

Structured summary for compatibility-test design.

## Endpoint

```http
POST https://api.siliconflow.cn/v1/chat/completions
```

International:

```http
POST https://api.siliconflow.com/v1/chat/completions
```

## Authentication

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Required Request Fields

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | e.g. `Pro/zai-org/GLM-4.7`, `Pro/zai-org/GLM-5`. See SiliconFlow model hub for current list. |
| `messages` | `array<object>` | Conversation messages. Roles include `system`, `user`, `assistant`, tool messages for function calling. |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. |
| `messages` | `array<object>` | Required. |
| `stream` | `boolean` | SSE when `true`; ends with `data: [DONE]`. |
| `max_tokens` | `integer` | Max generated tokens. Do not set to context-window upper bound; reserve ~10k for input/overhead. |
| `enable_thinking` | `boolean` | Thinking on/off for supported models (see list below). |
| `thinking_budget` | `integer` | Reasoning token budget. Range `128`–`32768`. |
| `reasoning_effort` | `string` | **Only** `deepseek-ai/DeepSeek-V4-Flash`. Values `high`, `max`; `low`/`medium` → `high`, `xhigh` → `max`. |
| `min_p` | `number` | Dynamic filtering threshold; Qwen3 only. `<= 1`. |
| `stop` | `string \| array<string>` | Up to **4** stop sequences. |
| `temperature` | `number` | `<= 2`. |
| `top_p` | `number` | Nucleus sampling. Range `0.1`–`1`. |
| `top_k` | `number` | `<= 100`. |
| `frequency_penalty` | `number` | Range `-2`–`2`. |
| `n` | `integer` | Number of generations; example/default `1`. |
| `response_format` | object | `{"type":"text"}` (default), `{"type":"json_object"}`, or `{"type":"json_schema","json_schema":{...}}`. Prefer `json_schema` where supported. |
| `tools` | `array<object>` | Function tools only; max 128 functions. |
| `tool_choice` | `string` | e.g. `"auto"`. Documented in function-calling examples. |

### `enable_thinking` supported models (official list, 2026-06)

`Pro/zai-org/GLM-5`, `Pro/zai-org/GLM-4.7`, `deepseek-ai/DeepSeek-V3.2`, `Pro/deepseek-ai/DeepSeek-V3.2`, `zai-org/GLM-4.6`, Qwen3 8B/14B/32B/30B-A3B, `tencent/Hunyuan-A13B-Instruct`, `zai-org/GLM-4.5V`, DeepSeek-V3.1-Terminus variants, Qwen3.5 397B/122B/35B/27B/9B/4B.

## VLM / Multimodal

Vision-capable models (e.g. `zai-org/GLM-4.6V`) accept multimodal `messages[].content` arrays:

| Content part | Fields |
|---|---|
| `text` | `text` |
| `image_url` | `url`, optional `detail` (`auto`, `low`, `high`) |
| `video_url` | `url`, optional `detail`, `max_frames`, `fps` |
| `audio_url` | `url` |

Model-family modality support varies; check model hub before testing.

## Response Fields

| Field | Notes |
|---|---|
| `id`, `object`, `created`, `model`, `choices`, `usage` | Standard chat.completion shape. |
| `choices[].message.content` | Final answer. |
| `choices[].message.reasoning_content` | Reasoning output on supported models. |
| `choices[].message.tool_calls` | Function calls; `arguments` is JSON text. |
| `choices[].finish_reason` | `stop`, `eos`, `length`, `tool_calls`. |
| `usage.prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` | Cache breakdown. |
| `usage.completion_tokens_details.reasoning_tokens` | Reasoning tokens. |
| Response header `x-siliconcloud-trace-id` | Request trace ID for troubleshooting. |

## Test Groups

| Group | Parameters |
|---|---|
| Core | `model`, `messages` |
| Sampling | `temperature`, `top_p`, `top_k`, `min_p`, `n`, `stop`, `frequency_penalty` |
| Length | `max_tokens` |
| Reasoning | `enable_thinking`, `thinking_budget`, `reasoning_effort` |
| Output | `response_format` (`text`, `json_object`, `json_schema`) |
| Tools | `tools`, `tool_choice` |
| Protocol | `stream` |
| Multimodal | `messages[].content[]`, `image_url`, `video_url`, `audio_url` |
| Observability | `x-siliconcloud-trace-id`, cache/reasoning usage fields |
