# Moonshot / Kimi Chat Completions API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://platform.moonshot.cn/docs/api/chat
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.


## Endpoint

| Item | Value |
|---|---|
| China | `POST https://api.moonshot.cn/v1/chat/completions` |
| Base URL | `https://api.moonshot.cn/v1` |
| Auth | `Authorization: Bearer <MOONSHOT_API_KEY>` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | Required. e.g. `moonshot-v1-128k`, vision-preview variants, kimi-k2.x |
| `messages` | `array<object>` | Required. Roles: `system`, `user`, `assistant`; multimodal content supported |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `temperature` | `float` | no | `0` | [0, 1] | Higher = more random |
| `top_p` | `float` | no | `1` | [0, 1] | Nucleus sampling; adjust temperature or top_p, not both |
| `n` | `integer` | no | `1` | 1–5 | Completions per input; near-zero temperature limits to 1 |
| `presence_penalty` | `float` | no | `0` | [-2, 2] | |
| `frequency_penalty` | `float` | no | `0` | [-2, 2] | |
| `max_tokens` | `integer` | no | — | — | **Deprecated** — use `max_completion_tokens` |
| `max_completion_tokens` | `integer` | no | ~1024 | — | Exceeding context window → error |
| `stop` | `string \| array` | no | — | max 5 strings, ≤32 bytes each | |
| `stream` | `boolean` | no | `false` | — | SSE streaming |
| `stream_options.include_usage` | `boolean` | no | `false` | — | Final usage chunk before `[DONE]` |
| `response_format` | `object` | no | `{"type":"text"}` | — | `text`, `json_object`, `json_schema` |
| `tools` | `array` | no | — | max 128 | Function tools |
| `prompt_cache_key` | `string` | no | — | — | Prompt caching / Kimi Code Plan |
| `safety_identifier` | `string` | no | — | — | Hashed stable user id |

## Multimodal

`messages[].content` supports `text`, `image_url`, `video_url` parts. See official docs for Partial Mode (`messages[].partial`).

## Raw Archive

Full OpenAPI export: [`docs/archive/moonshot-chat-raw.md`](../archive/moonshot-chat-raw.md)
