# DeepSeek Chat Completions API Notes

Source: https://api-docs.deepseek.com/zh-cn/api/create-chat-completion

Supplementary sources used for model/base-url and reasoning behavior:

- https://api-docs.deepseek.com/zh-cn/
- https://api-docs.deepseek.com/zh-cn/quick_start/pricing
- https://api-docs.deepseek.com/zh-cn/guides/thinking_mode

This document summarizes the DeepSeek OpenAI-compatible Chat Completions endpoint for `llm-rosetta` mock template and compatibility-test design. It is a structured summary of the docs page, not a verbatim mirror.

## Endpoint

```http
POST https://api.deepseek.com/chat/completions
```

The documented OpenAI-compatible `base_url` is:

```text
https://api.deepseek.com
```

The beta chat-prefix-completion feature requires:

```text
https://api.deepseek.com/beta
```

DeepSeek also documents an Anthropic-compatible SDK base URL:

```text
https://api.deepseek.com/anthropic
```

For direct HTTP calls in this tester, use the `/v1` base URL so the runner appends `/messages`:

```text
https://api.deepseek.com/anthropic/v1
```

## Authentication

For the OpenAI-compatible chat endpoint, use bearer-token authentication:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

For the Anthropic-compatible Messages endpoint, use Anthropic-style key authentication:

```http
X-Api-Key: <token>
anthropic-version: 2023-06-01
Content-Type: application/json
```

## Models

| Model | Notes |
|---|---|
| `deepseek-v4-flash` | Current documented chat model. Supports thinking and non-thinking modes. |
| `deepseek-v4-pro` | Current documented chat model. Supports thinking and non-thinking modes. |
| `deepseek-chat` | Compatibility alias. The quick-start page says it will be deprecated on `2026-07-24` and maps to `deepseek-v4-flash` non-thinking mode. |
| `deepseek-reasoner` | Compatibility alias. The quick-start page says it will be deprecated on `2026-07-24` and maps to `deepseek-v4-flash` thinking mode. |

Model details visible in the pricing page:

| Field | Value |
|---|---|
| Context length | `1M` |
| Max output length | `384K` |
| JSON Output | Supported by `deepseek-v4-flash` and `deepseek-v4-pro`. |
| Tool Calls | Supported by `deepseek-v4-flash` and `deepseek-v4-pro`. |
| Chat prefix completion | Supported by `deepseek-v4-flash` and `deepseek-v4-pro`; beta endpoint required. |
| FIM completion | Supported only in non-thinking mode. |

## Required Request Fields

| Field | Type | Notes |
|---|---|---|
| `model` | `string` | Required. Documented values are `deepseek-v4-flash` and `deepseek-v4-pro`. |
| `messages` | `array<object>` | Required. Conversation messages so far. At least one message is required. |

## Message Types

| Role | Required / Supported Fields | Notes |
|---|---|---|
| `system` | `role`, `content`; optional `name` | `content` is a string. |
| `user` | `role`, `content`; optional `name` | `content` is text content. |
| `assistant` | `role`, `content`; optional `name`, `prefix`, `reasoning_content` | `content` may be `null`. `prefix` and assistant-input `reasoning_content` are beta chat-prefix-completion fields. |
| `tool` | `role`, `content`, `tool_call_id` | Used to return a tool result for a previous tool call. |

Beta assistant prefix behavior:

- `messages[].prefix: true` forces the model response to begin with the assistant message prefix.
- It requires `base_url="https://api.deepseek.com/beta"`.
- In thinking mode, `messages[].reasoning_content` may be provided with prefix completion as the last assistant reasoning input; `prefix` must be `true`.

## Supported / Documented Request Parameters

| Parameter | Type | Compatibility Notes |
|---|---|---|
| `model` | `string` | Required. OpenAI-standard field, but current documented model ids are DeepSeek-specific. |
| `messages` | `array<object>` | Required. Supports `system`, `user`, `assistant`, and `tool` roles. |
| `thinking` | `object \| null` | DeepSeek extension for switching thinking mode. Shape: `{"type": "enabled"}` or `{"type": "disabled"}`. Default is `enabled`. With OpenAI Python SDK, pass this through `extra_body`. |
| `reasoning_effort` | `string` | Values: `high`, `max`. Default for ordinary requests is `high`; complex agent requests may automatically use `max`. Compatibility mappings: `low`/`medium` -> `high`, `xhigh` -> `max`. |
| `max_tokens` | `integer \| null` | Maximum generated completion tokens. Input + output is still limited by the model context window. |
| `response_format` | `object \| null` | Supports `{ "type": "text" }` and `{ "type": "json_object" }`. Default is `text`. JSON mode still requires prompt instructions to output JSON. |
| `stop` | `string \| array<string> \| null` | Stop sequences. Array form supports up to 16 strings. |
| `stream` | `boolean \| null` | If true, returns SSE chunks ending with `data: [DONE]`. |
| `stream_options` | `object \| null` | Only valid when `stream` is true. |
| `stream_options.include_usage` | `boolean` | If true, an extra pre-`[DONE]` chunk contains request usage with `choices: []`; other chunks include `usage: null`. |
| `temperature` | `number \| null` | Default `1`; documented max `2`. Docs recommend changing either `temperature` or `top_p`, not both. In thinking mode it is accepted for compatibility but does not take effect. |
| `top_p` | `number \| null` | Default `1`; documented max `1`. In thinking mode it is accepted for compatibility but does not take effect. |
| `tools` | `array<object> \| null` | Function-calling tools. Only `function` tools are currently supported; max 128 functions. |
| `tool_choice` | `string \| object \| null` | Values include `none`, `auto`, `required`, or a named function choice like `{"type":"function","function":{"name":"my_function"}}`. Defaults to `none` without tools and `auto` with tools. |
| `logprobs` | `boolean \| null` | If true, returns token log probabilities for generated output. |
| `top_logprobs` | `integer \| null` | Integer from 0 to 20. Requires `logprobs: true`. |
| `user_id` | `string \| null` | DeepSeek user identifier. Allowed characters: `[a-zA-Z0-9\-_]`; max length 512. Used for safety processing, KVCache isolation, and scheduling isolation. Do not include private user information. |
| `frequency_penalty` | deprecated | No longer supported. Passing it has no effect. In thinking mode it is also accepted for compatibility but ignored. |
| `presence_penalty` | deprecated | No longer supported. Passing it has no effect. In thinking mode it is also accepted for compatibility but ignored. |

## Thinking Mode

DeepSeek models support thinking mode, where the model returns reasoning before the final answer. Thinking mode is enabled by default.

Request controls:

| Control | OpenAI-compatible shape | Notes |
|---|---|---|
| Thinking on/off | `{"thinking":{"type":"enabled"}}` or `{"thinking":{"type":"disabled"}}` | Use `extra_body` when the SDK does not expose `thinking` directly. |
| Reasoning strength | `{"reasoning_effort":"high"}` or `{"reasoning_effort":"max"}` | `low` and `medium` map to `high`; `xhigh` maps to `max`. |

Thinking-mode compatibility notes:

- `temperature`, `top_p`, `presence_penalty`, and `frequency_penalty` are accepted for compatibility but do not take effect.
- The final response can include `choices[].message.reasoning_content` alongside `choices[].message.content`.
- Streaming responses can include `choices[].delta.reasoning_content`.
- If a thinking-mode assistant turn did not call tools, prior `reasoning_content` does not need to be appended to the next request; if passed, the API ignores it.
- If a thinking-mode assistant turn did call tools, the assistant `reasoning_content` must be preserved and sent back in following requests. The docs say omitting it can produce a `400` error.

## Function Calling

The docs describe `tools` as a list of function definitions the model may call. Currently only function tools are supported.

| Field | Type | Notes |
|---|---|---|
| `tools[].type` | `string` | Required. Value is `function`. |
| `tools[].function.name` | `string` | Required. Function name. Must use letters, numbers, underscores, or hyphens; max length 64. |
| `tools[].function.description` | `string` | Function description for the model. |
| `tools[].function.parameters` | `object` | JSON Schema object for input arguments. Omitting it defines an empty parameter list. |
| `tools[].function.strict` | `boolean` | Default `false`. Beta strict mode enforces function-call output against the JSON schema. |
| `tool_choice` | `string \| object` | `none`, `auto`, `required`, or named function choice. |

Tool-call response fields:

| Field | Type | Notes |
|---|---|---|
| `choices[].message.tool_calls[].id` | `string` | Tool call id. |
| `choices[].message.tool_calls[].type` | `string` | `function`. |
| `choices[].message.tool_calls[].function.name` | `string` | Called function name. |
| `choices[].message.tool_calls[].function.arguments` | `string` | JSON text generated by the model. Validate before execution because it may be invalid JSON or include extra parameters. |

## Non-Streaming Response Shape

The documented response is a `chat.completion` object.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique chat completion id. |
| `choices` | `array<object>` | Completion choices. |
| `created` | `integer` | Unix timestamp in seconds. |
| `model` | `string` | Model used. |
| `system_fingerprint` | `string` | Backend configuration fingerprint. |
| `object` | `string` | `chat.completion`. |
| `usage` | `object` | Token usage. |

Choice fields:

| Field | Type | Notes |
|---|---|---|
| `choices[].message.role` | `string` | `assistant`. |
| `choices[].message.content` | `string \| null` | Final assistant answer. |
| `choices[].message.reasoning_content` | `string \| null` | Returned only for thinking mode; contains reasoning before the final answer. |
| `choices[].message.tool_calls` | `array<object>` | Tool calls generated by the model. |
| `choices[].finish_reason` | `string` | Values: `stop`, `length`, `content_filter`, `tool_calls`, `insufficient_system_resource`. |
| `choices[].index` | `integer` | Choice index. |
| `choices[].logprobs` | `object \| null` | Token log-probability details when requested. |

Usage fields:

| Field | Type | Notes |
|---|---|---|
| `usage.completion_tokens` | `integer` | Completion token count. |
| `usage.prompt_tokens` | `integer` | Prompt token count. Equal to `prompt_cache_hit_tokens + prompt_cache_miss_tokens`. |
| `usage.prompt_cache_hit_tokens` | `integer` | Prompt tokens that hit the context cache. |
| `usage.prompt_cache_miss_tokens` | `integer` | Prompt tokens that missed the context cache. |
| `usage.total_tokens` | `integer` | Prompt + completion token count. |
| `usage.completion_tokens_details.reasoning_tokens` | `integer` | Thinking/reasoning token count. |

## Streaming Response Shape

With `stream: true`, DeepSeek returns `text/event-stream` chunks. Each chunk is a `chat.completion.chunk` object and the stream ends with:

```text
data: [DONE]
```

Documented chunk fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Same completion id across chunks. |
| `choices` | `array<object>` | Chunk choices. May be empty in the final usage chunk when `stream_options.include_usage` is true. |
| `choices[].delta.content` | `string \| null` | Incremental final-answer content. |
| `choices[].delta.reasoning_content` | `string \| null` | Incremental thinking content. |
| `choices[].delta.role` | `string` | Usually `assistant` on the first chunk. |
| `choices[].finish_reason` | `string \| null` | Same finish reasons as non-streaming. |
| `choices[].index` | `integer` | Choice index. |
| `choices[].logprobs` | `object \| null` | Token log-probability details when requested. |
| `created` | `integer` | Unix timestamp in seconds; same timestamp across chunks. |
| `model` | `string` | Model used. |
| `system_fingerprint` | `string` | Backend configuration fingerprint. |
| `object` | `string` | `chat.completion.chunk`. |
| `usage` | `object \| null` | Normally null on chunks; included in the extra final chunk when `include_usage` is true. |

## Log Probability Shape

When `logprobs` is enabled, the response can include log-probability details for both final answer tokens and reasoning tokens.

| Field | Type | Notes |
|---|---|---|
| `logprobs.content[]` | `array<object>` | Logprobs for generated answer tokens. |
| `logprobs.reasoning_content[]` | `array<object>` | Logprobs for generated reasoning tokens. |
| `token` | `string` | Output token. |
| `logprob` | `number` | Token log probability. `-9999.0` means the token probability is extremely small and not in the top 20 candidates. |
| `bytes` | `array<integer> \| null` | UTF-8 byte representation. |
| `top_logprobs[]` | `array<object>` | Top-N candidate tokens and log probabilities for the same position. |

## Minimal Request Example

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  -d '{
    "model": "deepseek-v4-pro",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "thinking": {"type": "enabled"},
    "reasoning_effort": "high"
  }'
```

## OpenAI SDK Style

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
    ],
    stream=False,
    reasoning_effort="high",
    extra_body={"thinking": {"type": "enabled"}},
)

print(response.choices[0].message.content)
```

## llm-rosetta Template Implications

Suggested DeepSeek test groups:

| Group | Parameters |
|---|---|
| Model aliases | `deepseek-v4-flash`, `deepseek-v4-pro`, legacy aliases `deepseek-chat`, `deepseek-reasoner` until `2026-07-24` |
| Sampling | `temperature`, `top_p`, `stop` |
| Ignored/deprecated sampling | `frequency_penalty`, `presence_penalty`; also `temperature` and `top_p` in thinking mode |
| Length | `max_tokens` |
| Reasoning | `thinking`, `reasoning_effort`, `reasoning_content`, `usage.completion_tokens_details.reasoning_tokens` |
| Output | `response_format: { "type": "json_object" }` |
| Tools | `tools`, `tool_choice`, `tools[].function.strict`, tool-result messages, reasoning-content replay after tool calls |
| Protocol | `stream`, `stream_options.include_usage` |
| Debug | `logprobs`, `top_logprobs`, logprobs for `content` and `reasoning_content` |
| Metadata / Isolation | `user_id`, cache-hit/miss usage fields, `system_fingerprint` |
| Beta | assistant `prefix`, assistant input `reasoning_content`, beta base URL |

Compatibility points to test against OpenAI:

- `thinking` and `user_id` are DeepSeek-specific extensions.
- `reasoning_effort` accepts DeepSeek's documented `high` and `max`, with compatibility mappings for `low`, `medium`, and `xhigh`.
- The currently documented models are `deepseek-v4-flash` and `deepseek-v4-pro`; `deepseek-chat` and `deepseek-reasoner` are compatibility aliases scheduled for deprecation on `2026-07-24`.
- `frequency_penalty` and `presence_penalty` are deprecated and ignored rather than functionally supported.
- In thinking mode, `temperature` and `top_p` are accepted but ignored.
- Thinking-mode tool-call transcripts must preserve assistant `reasoning_content`; omitting it after tool calls can produce a `400` error.
- Streaming can return `delta.reasoning_content` separately from `delta.content`.
- Usage includes cache-specific fields (`prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`) and reasoning token details.
- The response includes `system_fingerprint`.
- Function-call arguments are returned as JSON text and must be validated before execution.
