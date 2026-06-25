# MiniMax OpenAI-Compatible Chat Completions API Notes

> **Last verified:** 2026-06-16 against official API documentation.  
> **Official sources:**
> - https://platform.minimax.io/docs/api-reference/text-chat-openai (OpenAPI)
> - https://platform.minimax.io/docs/api-reference/text-openai-api (SDK guide)

Structured summary for compatibility-test design.

## Endpoint And Headers

| Item | China | International |
|---|---|---|
| Endpoint | `POST https://api.minimaxi.com/v1/chat/completions` | `POST https://api.minimax.io/v1/chat/completions` |
| Base URL | `https://api.minimaxi.com/v1` | `https://api.minimax.io/v1` |
| Auth | `Authorization: Bearer <MINIMAX_API_KEY>` | same |
| Content-Type | `application/json` | same |

Anthropic Messages (separate protocol):

| Item | China | International |
|---|---|---|
| Base URL | `https://api.minimaxi.com/anthropic/v1` | `https://api.minimax.io/anthropic/v1` |
| Auth | `X-Api-Key` + `anthropic-version: 2023-06-01` | same |

## Supported Models (OpenAPI enum, 2026-06)

| Model | Context | Notes |
|---|---|---|
| `MiniMax-M3` | 1,000,000 | Latest. Coding/agentic, multimodal (image + video), `thinking` control. |
| `MiniMax-M2.7` | 204,800 | ~60 tps |
| `MiniMax-M2.7-highspeed` | 204,800 | ~100 tps |
| `MiniMax-M2.5` | 204,800 | |
| `MiniMax-M2.5-highspeed` | 204,800 | |
| `MiniMax-M2.1` | 204,800 | |
| `MiniMax-M2.1-highspeed` | 204,800 | |
| `MiniMax-M2` | 204,800 | Agentic/reasoning |

Default smoke-test model: `MiniMax-M2.7` or `MiniMax-M3` when testing multimodal/thinking.

## Required Body Fields

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | Required. One of supported model IDs above. |
| `messages` | `array<object>` | Required. Supports text, image, video, tool-call content. |

## Documented Request Parameters

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. |
| `messages` | `array<object>` | Required. Multimodal content parts: `text`, `image_url`, `video_url`. |
| `thinking` | `object` | **MiniMax-M3 only** for on/off. `type`: `adaptive` (default) or `disabled`. M2.x cannot disable thinking; `disabled` is accepted but thinking stays on. |
| `reasoning_split` | `boolean` | Output-format switch only. When `true`, thinking goes to `reasoning_content` / `reasoning_details`; when `false`, thinking stays in `content` as `...`. Does not enable/disable thinking. |
| `stream` | `boolean` | Default `false`. Returns `chat.completion.chunk` when `true`. |
| `stream_options.include_usage` | `boolean` | Include token usage in stream when `true`. |
| `max_completion_tokens` | `integer` | Preferred length limit. M3: recommended 131072, max 524288. M2.x: recommended 65536, max 204800. |
| `max_tokens` | `integer` | **Deprecated.** Legacy alias; use `max_completion_tokens`. |
| `temperature` | `number` | Range `[0, 2]`, default `1`. Out-of-range returns error. |
| `top_p` | `number` | Range `[0, 1]`. Default `0.95` (M3) or `0.9` (M2.x). |
| `tools` | `array<object>` | Function tools. |
| `service_tier` | `string` | `standard` (default) or `priority` (1.5× price, priority admission). |

### Ignored / unsupported (official SDK guide)

| Parameter | Behavior |
|---|---|
| `presence_penalty` | Ignored |
| `frequency_penalty` | Ignored |
| `logit_bias` | Ignored |
| `function_call` | Unsupported; use `tools` |
| `n` | Only `1` supported |
| Audio input | Not supported via OpenAI-compatible API |

### Not in OpenAPI but commonly probed

`tool_choice`, `stop`, `seed`, `logprobs`, `response_format`, `parallel_tool_calls`, `metadata`, `user` — verify per model before marking supported.

## Multimodal (MiniMax-M3)

| Content part | Notes |
|---|---|
| `image_url` | `url`, `detail` (`low`, `default`, `high`). JPEG/PNG/GIF/WEBP; ≤10 MB. |
| `video_url` | `url` (URL/base64 ≤50 MB, or `mm_file://{file_id}` up to 512 MB), `detail`, `fps` (0.2–5, default 1). |

Request body max ~64 MB.

## Tool Calling

- Use `tools` (not deprecated `function_call`).
- Multi-turn: append full assistant message including `tool_calls`.
- Preserve `...` in `content` or full `reasoning_details` when `reasoning_split=true`.

## Response Fields

| Field | Notes |
|---|---|
| `choices[].message.content` | May contain `` blocks when `reasoning_split=false`. |
| `choices[].message.reasoning_content` | When `reasoning_split=true`. |
| `choices[].message.reasoning_details` | Structured thinking when `reasoning_split=true`. |
| `choices[].message.tool_calls` | Function calls. |
| `choices[].finish_reason` | `stop`, `length`, `content_filter`, `tool_calls`. |
| `usage.total_characters` | MiniMax extension. |
| `usage.completion_tokens_details.reasoning_tokens` | Reasoning tokens. |
| `usage.prompt_tokens_details.cached_tokens` | Prompt caching hits. |

## Test Groups

| Group | Parameters |
|---|---|
| Core | `model`, `messages` |
| Sampling | `temperature`, `top_p`, boundary `0` / `>2` |
| Ignored | `presence_penalty`, `frequency_penalty`, `logit_bias` |
| Length | `max_completion_tokens`, legacy `max_tokens` |
| Reasoning | `thinking`, `reasoning_split`, `reasoning_content`, `reasoning_details` |
| Tools | `tools`, tool-call continuity |
| Protocol | `stream`, `stream_options.include_usage` |
| Multimodal | `image_url`, `video_url` (M3 only) |
| Extra | `service_tier` |
| Restricted | `n != 1`, audio input |
