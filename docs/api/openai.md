---
channel_id: openai
protocol_id: chat_completions
doc_status: verified
doc_url: "https://platform.openai.com/docs/api-reference/chat/create"
last_verified: 2026-06-16
compare: false
required_parameters: [model, messages]
parameter_groups:
  Sampling: [temperature, top_p, n, seed, stop, frequency_penalty, presence_penalty, logit_bias]
  Length: [max_tokens, max_completion_tokens]
  Reasoning.Intensity: [reasoning_effort]
  Output.Structure: [response_format]
  Tools: [tools, tool_choice, parallel_tool_calls]
  Protocol: [stream, stream_options, stream_options.include_usage]
  Debug: [logprobs, top_logprobs]
  Metadata: [user, metadata, store]
  Extra: [service_tier, prediction, audio]
notes: 参考基线渠道；docs/api/openai.md 含更多未列入矩阵的字段。
---

# OpenAI Chat Completions Support List


Sources:

- https://platform.openai.com/docs/api-reference/chat/create
- https://platform.openai.com/docs/guides/text-generation
- https://platform.openai.com/docs/guides/reasoning
- https://platform.openai.com/docs/guides/function-calling
- https://platform.openai.com/docs/guides/structured-outputs
- https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat
- https://platform.openai.com/docs/guides/prompt-caching
- https://platform.openai.com/docs/guides/vision
- https://platform.openai.com/docs/guides/audio

This file is a support matrix for compatibility-test design. It intentionally lists supported fields and caveats instead of mirroring the full API reference. OpenAI recommends the Responses API for new projects, but this document only covers the Chat Completions endpoint.

## Endpoint And Headers

| Item | Support | Notes |
|---|---|---|
| Endpoint | supported | `POST https://api.openai.com/v1/chat/completions` |
| Base URL | supported | `https://api.openai.com/v1` |
| Auth | required | `Authorization: Bearer <OPENAI_API_KEY>` |
| `Content-Type` | required | `application/json` |
| Streaming content type | supported | Server-sent events when `stream: true`. |

## Required Body Fields

| Field | Support | Type | Notes |
|---|---|---|---|
| `model` | required | `string` | Model ID used to generate the response. |
| `messages` | required | `array<object>` | Conversation messages. Supports text and model-dependent multimodal content. |

## Model Families

| Family / Model | Support | Notes |
|---|---|---|
| `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano` | supported by current API reference | Current documented GPT-5.4 family in the local API reference. |
| `gpt-5.3-chat-latest` | supported by current API reference | Chat-latest model family entry. |
| `gpt-5.2`, `gpt-5.2-chat-latest`, `gpt-5.2-pro` | supported by current API reference | GPT-5.2 family. |
| `gpt-5.1`, `gpt-5.1-chat-latest`, `gpt-5.1-mini`, `gpt-5.1-codex` | supported by current API reference | GPT-5.1 family; reasoning defaults differ from older GPT-5 models. |
| `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-chat-latest` | supported | GPT-5 family. |
| `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano` | supported | GPT-4.1 family. |
| `o4-mini`, `o3`, `o3-mini`, `o1`, `o1-mini`, `o1-preview` | supported | Reasoning model families; parameter support differs. |
| `gpt-4o`, `gpt-4o-mini`, `chatgpt-4o-latest` | supported | GPT-4o family. |
| `gpt-4o-audio-preview`, `gpt-4o-mini-audio-preview` | supported | Audio-capable preview chat models. |
| `gpt-4o-search-preview`, `gpt-4o-mini-search-preview` | supported | Search-preview chat models. |
| `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` families | legacy supported | Older chat models remain listed in the API reference, but project access may vary. |

## Message Roles

| Role | Support | Content Shape | Notes |
|---|---|---|---|
| `developer` | supported | `string` or `array<text part>` | Preferred instruction role for o1 models and newer; replaces prior `system` usage for those models. Optional `name`. |
| `system` | supported | `string` or `array<text part>` | Legacy/global instruction role; for o1 and newer docs recommend `developer`. Optional `name`. |
| `user` | supported | `string` or `array<content part>` | Supports text, image, audio, and file content parts depending on model. Optional `name`. |
| `assistant` | supported | `string`, `array<text/refusal part>`, or omitted when tool/function call is present | Supports `audio`, `tool_calls`, deprecated `function_call`, `refusal`, and optional `name`. |
| `tool` | supported | `string` or `array<text part>` | Requires `tool_call_id`; returns tool output for a prior tool call. |
| `function` | deprecated | `string` | Legacy role for deprecated `functions` / `function_call`. Prefer `tool`. |

## Content Parts

| Part Type | Support | Shape / Notes |
|---|---|---|
| `text` | supported | `{ "type": "text", "text": "..." }`. Only content part supported for `developer`, `system`, and `tool` messages. |
| `image_url` | supported | `{ "type": "image_url", "image_url": { "url": "...", "detail": "auto|low|high" } }`; URL or base64 image data. Model-dependent. |
| `input_audio` | supported | `{ "type": "input_audio", "input_audio": { "data": "...", "format": "wav|mp3" } }`; base64 audio input. Model-dependent. |
| `file` | supported | `{ "type": "file", "file": { "file_data": "...", "file_id": "...", "filename": "..." } }`; for file/text inputs. |
| `refusal` | supported for assistant messages | `{ "type": "refusal", "refusal": "..." }`; assistant refusal content part. |

## Core Request Parameters

| Parameter | Support | Type / Values | Notes |
|---|---|---|---|
| `model` | required | `string` | Must be an OpenAI model ID available to the project. |
| `messages` | required | `array<object>` | Chat conversation. |
| `stream` | supported | `boolean` | Returns SSE chunks when true. |
| `stream_options.include_usage` | supported | `boolean` | Adds a final pre-`[DONE]` chunk with total usage and `choices: []`; may be missing if stream is interrupted. |
| `stream_options.include_obfuscation` | supported | `boolean` | Controls random `obfuscation` fields on streaming deltas. |
| `max_completion_tokens` | supported | `integer` | Preferred max output limit; includes visible output tokens and reasoning tokens. |
| `max_tokens` | deprecated | `integer` | Deprecated in favor of `max_completion_tokens`; not compatible with o-series models. |
| `n` | supported | `integer` | Number of choices to generate; billed across all generated choices. |
| `store` | supported | `boolean` | Allows storing output for distillation/evals. Supports text and image inputs; image inputs over 8 MB may be dropped. |
| `metadata` | supported | object of string pairs | Max 16 pairs; key max 64 chars; value max 512 chars. |
| `service_tier` | supported | `auto`, `default`, `flex`, `scale`, `priority` | Response may report the actual tier used, which can differ from request value. |
| `user` | supported but being replaced | `string` | Legacy stable end-user identifier; docs say use `safety_identifier` and `prompt_cache_key` instead. |
| `safety_identifier` | supported | `string`, max 64 | Stable abuse-prevention identifier; should not contain raw private user data. |
| `prompt_cache_key` | supported | `string` | Replaces `user` for cache bucketing / prompt-cache hit-rate optimization. |
| `prompt_cache_retention` | supported | `in_memory`, `24h` | `24h` enables extended prompt cache retention up to 24 hours. |
| `prediction` | supported | `{ "type": "content", "content": string | array<text part> }` | Predicted output for faster regeneration when generated tokens match supplied content. |

## Sampling And Generation Parameters

| Parameter | Support | Type / Range | Notes |
|---|---|---|---|
| `temperature` | supported | number `0` to `2` | Docs recommend changing either `temperature` or `top_p`, not both. Reasoning-model support can differ. |
| `top_p` | supported | number | Nucleus sampling alternative to temperature. |
| `frequency_penalty` | supported | number `-2.0` to `2.0` | Penalizes repeated token frequency. |
| `presence_penalty` | supported | number `-2.0` to `2.0` | Penalizes already-mentioned topics/tokens. |
| `logit_bias` | supported | token-id map to number `-100` to `100` | Tokenizer/model-dependent. |
| `seed` | beta supported | integer | Best-effort deterministic sampling; use `system_fingerprint` to detect backend changes. |
| `stop` | supported with caveat | string or `array<string>` | Up to 4 stop sequences. Not supported with latest reasoning models `o3` and `o4-mini`. |
| `logprobs` | supported | `boolean` | Returns log probabilities for output tokens in `message.content` when supported. |
| `top_logprobs` | supported | integer `0` to `20` | Requires `logprobs: true`. |
| `verbosity` | supported | `low`, `medium`, `high` | Controls response verbosity where supported. |

## Reasoning Parameters

| Parameter / Behavior | Support | Type / Values | Notes |
|---|---|---|---|
| `reasoning_effort` | supported for reasoning models | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` | Reduces or increases reasoning token budget where supported. |
| `gpt-5.1` reasoning default | supported | default `none` | Docs say `gpt-5.1` supports `none`, `low`, `medium`, `high`; tool calls are supported for all these values. |
| Pre-`gpt-5.1` reasoning default | supported | default `medium` | Docs say models before `gpt-5.1` do not support `none`. |
| `gpt-5-pro` reasoning effort | restricted | `high` only | Docs say `gpt-5-pro` defaults to and only supports `high`. |
| `xhigh` reasoning effort | supported with caveat | `xhigh` | Supported for all models after `gpt-5.1-codex-max`. |
| Reasoning token accounting | supported | response usage field | `usage.completion_tokens_details.reasoning_tokens`. |

## Output Format Parameters

| Parameter | Support | Shape | Notes |
|---|---|---|---|
| `response_format.type=text` | supported | `{ "type": "text" }` | Default text response format. |
| `response_format.type=json_object` | supported | `{ "type": "json_object" }` | Older JSON mode. Prompt must still instruct the model to produce JSON. |
| `response_format.type=json_schema` | supported | `{ "type": "json_schema", "json_schema": { "name": "...", "description": "...", "schema": {...}, "strict": true } }` | Structured Outputs. `strict: true` supports only a subset of JSON Schema. |

## Tool Calling

| Parameter / Field | Support | Shape / Values | Notes |
|---|---|---|---|
| `tools` | supported | `array<object>` | Supports function tools and current custom tools. |
| `tools[].type=function` | supported | OpenAI function tool | `function.name` required; max 64 chars; allowed chars are letters, numbers, underscores, and dashes. |
| `tools[].function.description` | supported | `string` | Optional function description. |
| `tools[].function.parameters` | supported | JSON Schema object | Optional; omitted schema means empty parameter list. |
| `tools[].function.strict` | supported | `boolean` | Strict schema adherence; only subset of JSON Schema is supported. |
| `tools[].type=custom` | supported | custom tool | Custom tool input can be free-form text or grammar-constrained text. |
| `tools[].custom.format.type=text` | supported | `{ "type": "text" }` | Unconstrained custom-tool input. |
| `tools[].custom.format.type=grammar` | supported | `{ "type": "grammar", "grammar": { "syntax": "lark|regex", "definition": "..." } }` | Grammar-constrained custom-tool input. |
| `parallel_tool_calls` | supported | `boolean` | Enables parallel tool calls during tool use. |
| `tool_choice=none` | supported | string | Model must not call tools. Default when no tools are present. |
| `tool_choice=auto` | supported | string | Model may answer or call one or more tools. Default when tools are present. |
| `tool_choice=required` | supported | string | Model must call one or more tools. |
| `tool_choice` named function | supported | `{ "type": "function", "function": { "name": "..." } }` | Forces a specific function tool. |
| `tool_choice` named custom | supported | `{ "type": "custom", "custom": { "name": "..." } }` | Forces a specific custom tool. |
| `tool_choice.type=allowed_tools` | supported | `{ "type": "allowed_tools", "allowed_tools": { "mode": "auto|required", "tools": [...] } }` | Restricts tool choices to a predefined set. |
| `functions` | deprecated | legacy array | Deprecated in favor of `tools`. |
| `function_call` | deprecated | legacy string/object | Deprecated in favor of `tool_choice`; response `message.function_call` is also deprecated. |

## Web Search

| Parameter / Field | Support | Shape / Values | Notes |
|---|---|---|---|
| `web_search_options` | supported | object | Chat Completions web search control. Model-dependent. |
| `web_search_options.search_context_size` | supported | `low`, `medium`, `high` | Defaults to `medium`. |
| `web_search_options.user_location.type` | supported | `approximate` | Provides approximate user location for search. |
| `web_search_options.user_location.approximate.city` | supported | `string` | Optional city. |
| `web_search_options.user_location.approximate.country` | supported | two-letter ISO country code | Optional country. |
| `web_search_options.user_location.approximate.region` | supported | `string` | Optional region. |
| `web_search_options.user_location.approximate.timezone` | supported | IANA timezone string | Optional timezone. |
| `choices[].message.annotations[].url_citation` | supported | response field | Returned for web-search citations when applicable. |

## Modalities And Audio

| Parameter / Field | Support | Values / Notes |
|---|---|---|
| `modalities` | supported | Output modalities. Default `["text"]`; audio-capable models can use `["text", "audio"]`. |
| `audio` | required for audio output | Required when `modalities` includes `audio`. |
| `audio.format` | supported | `wav`, `aac`, `mp3`, `flac`, `opus`, `pcm16` in the current API reference enum. |
| `audio.voice` | supported | Built-in voice string or custom voice object `{ "id": "voice_1234" }`; exact voice availability is model-dependent. |
| `assistant.audio` | supported in message/response | Previous audio response reference in request, or generated audio object in response. |
| `choices[].message.audio.id` | supported | Audio response ID. |
| `choices[].message.audio.data` | supported | Base64 encoded generated audio bytes. |
| `choices[].message.audio.expires_at` | supported | Unix expiry timestamp for multi-turn audio reuse. |
| `choices[].message.audio.transcript` | supported | Text transcript of generated audio. |

## Cache, Storage, Safety, And Observability

| Field | Support | Notes |
|---|---|---|
| `prompt_cache_key` | supported | Cache bucketing key; preferred over `user` for cache optimization. |
| `prompt_cache_retention` | supported | `in_memory` or `24h`. |
| `store` | supported | Opt-in output storage for distillation/evals. |
| `metadata` | supported | Stored key-value metadata for dashboard/API querying. |
| `safety_identifier` | supported | Stable safety identifier; hash raw user identifiers before sending. |
| `user` | legacy supported | Being replaced by `safety_identifier` and `prompt_cache_key`. |
| `system_fingerprint` | response supported | Useful with `seed` to monitor backend determinism changes. |
| `service_tier` | request/response supported | Request controls processing tier; response reports actual tier. |

## Non-Streaming Response Fields

| Field | Support | Type / Notes |
|---|---|---|
| `id` | supported | Unique chat completion ID. |
| `object` | supported | `chat.completion`. |
| `created` | supported | Unix timestamp in seconds. |
| `model` | supported | Model used. |
| `choices` | supported | Array of choices. |
| `service_tier` | supported | Actual service tier used, if available. |
| `system_fingerprint` | supported | Backend configuration fingerprint, nullable/optional. |
| `usage` | supported | Token usage and detail fields. |

## Choice And Assistant Response Fields

| Field | Support | Notes |
|---|---|---|
| `choices[].finish_reason` | supported | `stop`, `length`, `tool_calls`, `content_filter`, deprecated `function_call`. |
| `choices[].index` | supported | Choice index. |
| `choices[].message.role` | supported | `assistant`. |
| `choices[].message.content` | supported | Assistant text content. |
| `choices[].message.refusal` | supported | Refusal text. |
| `choices[].message.annotations` | supported | Includes URL citations for web search. |
| `choices[].message.audio` | supported | Audio response payload/reference when audio output requested. |
| `choices[].message.tool_calls` | supported | Function or custom tool calls. |
| `choices[].message.function_call` | deprecated | Legacy function-call response field. |
| `choices[].logprobs.content` | supported | Token logprobs for generated content. |
| `choices[].logprobs.refusal` | supported | Token logprobs for refusal content. |

## Tool-Call Response Fields

| Field | Support | Notes |
|---|---|---|
| `tool_calls[].id` | supported | Tool call ID used by subsequent `tool` message. |
| `tool_calls[].type=function` | supported | Function tool call. |
| `tool_calls[].function.name` | supported | Called function name. |
| `tool_calls[].function.arguments` | supported | JSON string generated by the model; validate before executing. |
| `tool_calls[].type=custom` | supported | Custom tool call. |
| `tool_calls[].custom.name` | supported | Called custom tool name. |
| `tool_calls[].custom.input` | supported | Custom tool input string generated by the model. |

## Usage Fields

| Field | Support | Notes |
|---|---|---|
| `usage.prompt_tokens` | supported | Prompt token count. |
| `usage.completion_tokens` | supported | Generated completion token count. |
| `usage.total_tokens` | supported | Prompt + completion token count. |
| `usage.prompt_tokens_details.cached_tokens` | supported | Prompt tokens served from cache. |
| `usage.prompt_tokens_details.audio_tokens` | supported | Audio input tokens. |
| `usage.completion_tokens_details.reasoning_tokens` | supported | Reasoning token count. |
| `usage.completion_tokens_details.audio_tokens` | supported | Audio output tokens. |
| `usage.completion_tokens_details.accepted_prediction_tokens` | supported | Prediction tokens accepted. |
| `usage.completion_tokens_details.rejected_prediction_tokens` | supported | Prediction tokens rejected; still count toward billing/context limits. |

## Streaming Response Shape

| Field / Event | Support | Notes |
|---|---|---|
| SSE chunks | supported | Each chunk is a chat completion chunk object. |
| End marker | supported | Stream ends with `data: [DONE]`. |
| `object` | supported | `chat.completion.chunk`. |
| `id`, `created`, `model`, `system_fingerprint` | supported | Same logical completion identity across chunks. |
| `choices[].delta.role` | supported | Usually appears at stream start. |
| `choices[].delta.content` | supported | Incremental generated text. |
| `choices[].delta.tool_calls` | supported | Incremental tool-call data when tools are used. |
| `choices[].finish_reason` | supported | Final chunk finish reason. |
| `usage` | supported with caveat | Null on normal chunks; final aggregate usage chunk only when `stream_options.include_usage` is set. |
| `obfuscation` | supported | Random field controlled by `stream_options.include_obfuscation`. |

## Error Status Support

| Status | Meaning |
|---|---|
| `400` | Bad request / invalid parameters / malformed input. |
| `401` | Missing or invalid authentication. |
| `403` | Permission or access issue. |
| `404` | Resource/model not found. |
| `409` | Conflict, for example concurrent state changes in some API workflows. |
| `422` | Semantic validation failure. |
| `429` | Rate limit or quota exceeded. |
| `500` | Internal server error. |
| `503` | Service unavailable or overloaded. |

## Compatibility Test Implications

| Group | Fields To Test |
|---|---|
| Required / defaults | `model`, `messages`, default `stream`, default `tool_choice`, default `modalities` |
| Message roles | `developer`, `system`, `user`, `assistant`, `tool`, deprecated `function` |
| Content parts | `text`, `image_url`, `input_audio`, `file`, assistant `refusal` |
| Sampling | `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `logit_bias`, `seed`, `stop`, `logprobs`, `top_logprobs`, `verbosity` |
| Length | `max_completion_tokens`, deprecated `max_tokens` |
| Reasoning | `reasoning_effort`, model-specific defaults, `usage.completion_tokens_details.reasoning_tokens` |
| Output | `response_format` variants: `text`, `json_object`, `json_schema` |
| Tools | function tools, custom tools, `strict`, `tool_choice`, `allowed_tools`, `parallel_tool_calls`, deprecated `functions` / `function_call` |
| Web search | `web_search_options`, location hints, response URL citations |
| Multimodal | image input, audio input, file input, audio output, multi-turn audio reference |
| Cache / safety | `prompt_cache_key`, `prompt_cache_retention`, `safety_identifier`, legacy `user`, `store`, `metadata` |
| Streaming | `stream`, `stream_options.include_usage`, `stream_options.include_obfuscation`, streamed tool-call deltas |
| Response parsing | `finish_reason`, `refusal`, `annotations`, `tool_calls`, `audio`, `logprobs`, usage detail fields |

Important compatibility caveats:

- Chat Completions remains supported, but OpenAI recommends Responses API for new projects.
- Parameter support differs by model, especially for reasoning models and multimodal/audio models.
- `developer` messages should be tested separately from `system` messages because o1 and newer models use `developer` as the preferred instruction role.
- Use `max_completion_tokens` for new tests; keep `max_tokens` only as a deprecated compatibility probe.
- `stop` should be treated as unsupported for latest reasoning models `o3` and `o4-mini`.
- `functions`, `function_call`, and `function` role are deprecated legacy surfaces; new tests should prefer `tools`, `tool_choice`, and `tool` messages.
- `json_object` is older JSON mode; prefer `json_schema` for structured-output tests where the model supports it.
- `seed` is best effort only; deterministic tests should compare `system_fingerprint` and avoid strict text equality when backend fingerprint changes.
- `user` is being replaced by `safety_identifier` and `prompt_cache_key`; test all three fields if provider compatibility includes legacy OpenAI clients.
