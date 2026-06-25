# OpenRouter Chat Completions API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.


## Endpoint

`POST https://openrouter.ai/api/v1/chat/completions`

## Required Body Fields

| Field | Support | Type | Notes |
|---|---|---|---|
| `messages` | required | `array<object>` | OpenAPI requires `messages` with at least one item. Older overview docs also mention `prompt`, but current chat OpenAPI requires `messages`. |
| `model` | optional | `string` | If omitted, OpenRouter uses the user/payer default model. |

## Sampling And Generation Parameters

| Parameter | Support | Type / Range | Default / Notes |
|---|---|---|---|
| `temperature` | supported | float `0.0` to `2.0` | Default `1.0`. |
| `top_p` | supported | float `0.0` to `1.0` | Default `1.0`. |
| `top_k` | in ChatRequest OpenAPI | integer `>= 0` | Provider-dependent; parameters page notes unavailable for some OpenAI models. |
| `frequency_penalty` | supported | float `-2.0` to `2.0` | Default `0.0`. |
| `presence_penalty` | supported | float `-2.0` to `2.0` | Default `0.0`. |
| `repetition_penalty` | in ChatRequest OpenAPI | float | Default `1.0` = no penalty; provider-dependent. |
| `min_p` | in ChatRequest OpenAPI | float `0.0` to `1.0` | Provider-dependent. |
| `top_a` | in ChatRequest OpenAPI | float `0.0` to `1.0` | Provider-dependent. |
| `logit_bias` | supported | object token-id -> number | Values typically `-100` to `100`; provider/tokenizer-dependent. |
| `logprobs` | supported | `boolean` | Returns output token log probabilities when supported. |
| `top_logprobs` | supported | integer `0` to `20` | Requires `logprobs: true`. |
| `prediction` | not in ChatRequest OpenAPI | object | Mentioned on overview/parameters pages only; omitted from protocol matrix until OpenAPI includes it. |

## Additional OpenRouter Parameters

| Parameter | Type | Default | Range | Notes |
|---|---|---|---|---|
| `models` | `array<string>` | — | — | Fallback routing list |
| `provider` | `object` | — | — | Routing preferences |
| `plugins` | `array` | — | — | web_search, web_fetch, datetime |
| `reasoning` | `object` | — | — | `effort`, `summary` |
| `reasoning_effort` | `string` | — | — | Shorthand for `reasoning.effort` |
| `session_id` | `string` | — | max 256 | Sticky routing |
| `parallel_tool_calls` | `boolean` | — | — | |
| `repetition_penalty` | `float` | `1` | — | Provider-dependent |
| `top_k` | `integer` | — | ≥0 | Provider-dependent |
| `min_p` | `float` | — | — | Provider-dependent |

## Raw OpenAPI Archive

[`docs/archive/openrouter-chat-raw.openapi.md`](../archive/openrouter-chat-raw.openapi.md)
