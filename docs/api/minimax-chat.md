# MiniMax Chat Completions API Notes

> **Last verified:** 2026-06-25 against official API documentation.
> **Official source:** https://platform.minimax.io/docs/api-reference/text-chat-openai
> **Protocol ID:** `chat_completions`

Structured summary for Noctua compatibility-test design.


## Endpoint

| Region | Endpoint |
|---|---|
| China | `POST https://api.minimaxi.com/v1/chat/completions` |
| International | `POST https://api.minimax.io/v1/chat/completions` |

## Required Request Fields

| Parameter | Type | Notes |
|---|---|---|
| `model` | `string` | MiniMax-M3, M2.7, M2.5, M2.1, M2 variants |
| `messages` | `array<object>` | Text / image / video / tool content |

## Documented Request Parameters

| Parameter | Type | Required | Default | Range | Notes |
|---|---|---|---|---|---|
| `thinking` | `object` | no | `{"type":"adaptive"}` | — | M3 on/off; M2.x cannot disable |
| `thinking.type` | `string` | no | `adaptive` | `adaptive` \| `disabled` | M3 only for `disabled` |
| `reasoning_split` | `boolean` | no | — | — | Output format only; does not toggle thinking |
| `stream` | `boolean` | no | `false` | — | |
| `stream_options.include_usage` | `boolean` | no | `false` | — | |
| `max_completion_tokens` | `integer` | no | — | M3: rec 131072, max 524288; M2.x: rec 65536, max 204800 | |
| `max_tokens` | `integer` | no | — | — | **Deprecated** |
| `temperature` | `number` | no | `1` | [0, 2] | Out-of-range → error |
| `top_p` | `number` | no | M3: `0.95`; M2.x: `0.9` | [0, 1] | |
| `tools` | `array` | no | — | — | Use `tools`, not `function_call` |
| `service_tier` | `string` | no | `standard` | `standard` \| `priority` | Priority 1.5× price |

### Ignored / unsupported (official SDK guide)

| Parameter | Behavior |
|---|---|
| `presence_penalty` | Ignored |
| `frequency_penalty` | Ignored |
| `logit_bias` | Ignored |
| `function_call` | Unsupported; use `tools` |
| `n` | Only `1` supported |
| Audio input | Not supported via OpenAI-compatible API |

### Not in OpenAPI

## Raw Archive

[`docs/archive/minimax-chat-raw.md`](../archive/minimax-chat-raw.md)
