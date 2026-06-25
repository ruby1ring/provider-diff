# Claude OpenAI SDK Compatibility Support List

Sources:

- https://platform.claude.com/docs/en/api/openai-sdk
- https://platform.claude.com/docs/en/api/openai-sdk.md
- https://platform.claude.com/docs/en/api/messages.md
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs

This file is a support matrix for compatibility-test design. It summarizes Anthropic's official OpenAI SDK compatibility layer for Claude. The compatibility layer is intended for testing and model comparison; Anthropic recommends the native Claude API for production usage and for the full Claude feature set.

## Endpoint And Headers

| Item | Support | Notes |
|---|---|---|
| Endpoint | supported | `POST https://api.anthropic.com/v1/chat/completions` |
| Base URL | supported | `https://api.anthropic.com/v1` |
| Auth | required | `Authorization: Bearer <ANTHROPIC_API_KEY>` |
| `Content-Type` | required | `application/json` |
| Streaming content type | supported | Server-sent events when `stream: true`. |
| Rate limits | Anthropic standard | Follows Anthropic's standard limits for the `/v1/messages` endpoint. |

## OpenAI SDK Usage

Use an official OpenAI SDK, change the base URL, use a Claude API key, and pass Claude model names.

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
    base_url="https://api.anthropic.com/v1/",
)

response = client.chat.completions.create(
    model="claude-opus-4-8",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Who are you?"},
    ],
)
```

## Important Compatibility Limitations

| Area | Support | Notes |
|---|---|---|
| Production readiness | limited | Official docs describe this as a compatibility layer for testing and comparing model capabilities, not the recommended long-term API surface for most use cases. |
| Unsupported fields | accepted/ignored | Most unsupported fields are silently ignored rather than rejected. |
| Tool strict mode | ignored | `tools[].function.strict` and `functions[].strict` are ignored. Use native Claude Structured Outputs for guaranteed schema conformance. |
| Audio input | ignored | Audio input content is stripped from input. |
| Prompt caching | not supported in compatibility layer | Use the native Anthropic SDK/API for prompt caching. |
| System/developer messages | supported with transformation | All system/developer messages are hoisted and concatenated with `\n` into a single initial system message. |
| Extended thinking | supported via `thinking` | Add `thinking: { "type": "enabled", "budget_tokens": ... }` through SDK extra body. The OpenAI SDK compatibility response does not expose Claude's detailed thinking output. |

## Model Names

| Model | Support | Notes |
|---|---|---|
| `claude-opus-4-8` | documented example | Used in the official OpenAI SDK compatibility quick start. |
| `claude-sonnet-4-6` | documented example | Used in the official extended thinking example. |
| Other Claude model names | supported if available | Use Claude API model IDs available to the account. |

## Required Body Fields

| Field | Support | Type | Notes |
|---|---|---|---|
| `model` | required | `string` | Use Claude model names. |
| `messages` | required | `array<object>` | OpenAI-style chat messages are translated to Claude Messages API input. |

## Simple Request Fields

| Field | Support | Notes |
|---|---|---|
| `model` | supported | Use Claude model names. |
| `max_tokens` | fully supported | Legacy OpenAI field accepted. |
| `max_completion_tokens` | fully supported | Preferred OpenAI max output field. |
| `stream` | fully supported | Returns streaming chunks. |
| `stream_options` | fully supported | Includes usage support per official table. |
| `top_p` | fully supported | Nucleus sampling. |
| `parallel_tool_calls` | fully supported | Tool-call parallelism control. |
| `stop` | supported with caveat | All non-whitespace stop sequences work. |
| `temperature` | supported with caveat | Values from `0` to `1` are accepted; values greater than `1` are capped at `1`. |
| `n` | restricted | Must be exactly `1`; `choices[]` always has length `1`. |
| `logprobs` | ignored | Accepted but not effective. |
| `metadata` | ignored | Accepted but not effective. |
| `response_format` | ignored | Use native Claude Structured Outputs for guaranteed JSON/schema output. |
| `prediction` | ignored | Accepted but not effective. |
| `presence_penalty` | ignored | Accepted but not effective. |
| `frequency_penalty` | ignored | Accepted but not effective. |
| `seed` | ignored | Accepted but not effective. |
| `service_tier` | ignored | Accepted but not effective. |
| `audio` | ignored | Accepted but not effective. |
| `logit_bias` | ignored | Accepted but not effective. |
| `store` | ignored | Accepted but not effective. |
| `user` | ignored | Accepted but not effective. |
| `modalities` | ignored | Accepted but not effective. |
| `top_logprobs` | ignored | Accepted but not effective. |
| `reasoning_effort` | ignored | Accepted but not effective; use native `thinking` for Claude reasoning. |
| `thinking` | Claude extension | Supported through OpenAI SDK extra body; not an OpenAI Chat Completions standard field. |

## Native Messages Usage And Thinking

| Item | Support | Notes |
|---|---|---|
| Endpoint | supported | `POST https://api.anthropic.com/v1/messages` |
| Base URL | supported | `https://api.anthropic.com/v1` |
| Auth | required | `x-api-key: <ANTHROPIC_API_KEY>` |
| Version header | required | `anthropic-version: 2023-06-01` |
| Usage fields | supported | Native Messages responses include `usage.input_tokens` and `usage.output_tokens`. |
| Thinking output | supported | With extended thinking enabled, `content[]` contains `type: "thinking"` blocks followed by text blocks. |
| Thinking text | supported | The thinking block's `thinking` field contains summarized thinking by default on Claude Sonnet 4.6. |
| Thinking signature | supported | The thinking block includes `signature` for multi-turn continuity. |
| Thinking token usage | supported | `usage.output_tokens_details.thinking_tokens` reports billed internal reasoning tokens. |
| Disable thinking | supported on most current models | Use `thinking: { "type": "disabled" }` when supported by the selected model; then no thinking content block should be returned. |

## Tools And Functions

| Field | Support | Notes |
|---|---|---|
| `tools[].function.name` | fully supported | OpenAI function tool name. |
| `tools[].function.description` | fully supported | Tool description. |
| `tools[].function.parameters` | fully supported | JSON Schema parameters. |
| `tools[].function.strict` | ignored | Accepted but schema adherence is not guaranteed through this compatibility layer. |
| `functions[].name` | fully supported | Deprecated OpenAI function field is still mapped. |
| `functions[].description` | fully supported | Deprecated OpenAI function field is still mapped. |
| `functions[].parameters` | fully supported | Deprecated OpenAI function field is still mapped. |
| `functions[].strict` | ignored | Accepted but not effective. |
| `tool_choice` | supported | Official messages table marks this as supported for tool/function roles; common OpenAI forms should be probed. |

## Message Roles

| Role | Support | Content Shape | Notes |
|---|---|---|---|
| `developer` | supported with transformation | `content` fully supported | Hoisted into the initial system message; `name` ignored. |
| `system` | supported with transformation | `content` fully supported | Hoisted into the initial system message; `name` ignored. |
| `user` | supported | string or content array | `name` ignored. |
| `assistant` | supported | string or text/refusal array | `content`, text parts, and `tool_calls` supported; `function_call` supported; `audio` and `refusal` ignored. |
| `tool` | supported | string or text array | `tool_call_id` supported; `name` ignored. |
| `function` | supported | string or text array | Deprecated OpenAI function role accepted; `name` ignored. |

## Content Parts

| Part Type | Support | Notes |
|---|---|---|
| `text` | fully supported | Supported in content arrays. |
| `image_url.url` | fully supported | User image input via URL/data URL. |
| `image_url.detail` | ignored | Detail control is accepted but not effective. |
| `input_audio` | ignored | Audio is stripped from input. |
| `file` | ignored | File content parts are ignored in the compatibility layer. |
| assistant `refusal` part | ignored | Accepted but not effective. |

## Response Fields

| Field | Support | Notes |
|---|---|---|
| `id` | fully supported | OpenAI-compatible response ID. |
| `choices[]` | restricted | Always length `1`. |
| `choices[].finish_reason` | fully supported | OpenAI-compatible finish reason. |
| `choices[].index` | fully supported | Choice index. |
| `choices[].message.role` | fully supported | Assistant role. |
| `choices[].message.content` | fully supported | Assistant content. |
| `choices[].message.tool_calls` | fully supported | Tool call response. |
| `object` | fully supported | OpenAI-compatible object field. |
| `created` | fully supported | Unix timestamp. |
| `model` | fully supported | Model used. |
| `usage.completion_tokens` | fully supported | Completion token count. |
| `usage.prompt_tokens` | fully supported | Prompt token count. |
| `usage.total_tokens` | fully supported | Total token count. |
| `usage.completion_tokens_details` | always empty | Present but empty per docs. |
| `usage.prompt_tokens_details` | always empty | Present but empty per docs. |
| `choices[].message.refusal` | always empty | Empty compatibility field. |
| `choices[].message.audio` | always empty | Empty compatibility field. |
| `logprobs` | always empty | Empty compatibility field. |
| `service_tier` | always empty | Empty compatibility field. |
| `system_fingerprint` | always empty | Empty compatibility field. |

## Error And Header Compatibility

| Area | Support | Notes |
|---|---|---|
| Error format | compatible shape | Error formats are consistent with OpenAI API shape, but detailed messages differ. |
| Rate-limit headers | supported | `x-ratelimit-limit-*`, `x-ratelimit-remaining-*`, and `x-ratelimit-reset-*` headers are supported. |
| `retry-after` | supported | Retry delay header. |
| `request-id` | supported | Request identifier. |
| `openai-version` | fixed | Always `2020-10-01`. |
| `authorization` | supported | Bearer token authentication. |
| `openai-processing-ms` | always empty | Empty compatibility header. |

## Compatibility-Test Notes

- Treat `ignored` fields as accepted request paths with no documented effect.
- `n=1` should be accepted; `n>1` should be rejected or treated as non-compliant because the docs say `n` must be exactly `1`.
- Do not assert exact generated text.
- For `response_format`, expect 2xx acceptance but do not expect valid JSON solely because the parameter was passed.
- For `tools[].function.strict`, expect 2xx acceptance but do not assert strict schema adherence.
- For streaming with `stream_options.include_usage`, assert SSE shape and usage chunks when present.
