# OpenRouter Chat Completions Support List

Sources:

- https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
- https://openrouter.ai/docs/api-reference/parameters
- https://openrouter.ai/docs/api-reference/overview
- https://openrouter.ai/openapi.json

This file is a support matrix for compatibility-test design. It intentionally lists supported fields and caveats instead of mirroring the full OpenAPI schema.

## Endpoint And Headers

| Item | Support | Notes |
|---|---|---|
| Endpoint | supported | `POST https://openrouter.ai/api/v1/chat/completions` |
| Base URL | supported | `https://openrouter.ai/api/v1` |
| Auth | required | `Authorization: Bearer <OPENROUTER_API_KEY>` |
| `Content-Type` | required | `application/json` |
| `HTTP-Referer` | optional | App attribution / rankings on OpenRouter. |
| `X-OpenRouter-Title` | optional | App attribution title. `X-Title` is also accepted by docs. |
| `X-OpenRouter-Categories` | optional | Marketplace categories. |
| `X-OpenRouter-Experimental-Metadata` | optional | `enabled` surfaces `openrouter_metadata` in responses. Default is `disabled`. |

## Required Body Fields

| Field | Support | Type | Notes |
|---|---|---|---|
| `messages` | required | `array<object>` | OpenAPI requires `messages` with at least one item. Older overview docs also mention `prompt`, but current chat OpenAPI requires `messages`. |
| `model` | optional | `string` | If omitted, OpenRouter uses the user/payer default model. |

## Message Roles

| Role | Support | Content Shape | Notes |
|---|---|---|---|
| `system` | supported | `string` or `array<text part>` | Optional `name`. |
| `developer` | supported | `string` or `array<text part>` | Optional `name`; present in current OpenAPI. |
| `user` | supported | `string` or `array<content part>` | Optional `name`. |
| `assistant` | supported | `string`, `array<content part>`, or `null` | Supports `name`, `audio`, `images`, `reasoning`, `reasoning_details`, `refusal`, `tool_calls`. |
| `tool` | supported | `string` or `array<content part>` | Requires `tool_call_id`. |

## Content Parts

| Part Type | Support | Shape / Notes |
|---|---|---|
| `text` | supported | `{ "type": "text", "text": "..." }`; can include `cache_control`. |
| `image_url` | supported | `{ "type": "image_url", "image_url": { "url": "...", "detail": "auto|low|high" } }`; data URLs are supported. |
| `input_audio` | supported | `{ "type": "input_audio", "input_audio": { "data": "...", "format": "wav|mp3|..." } }`; provider support varies. |
| `video_url` | supported | `{ "type": "video_url", "video_url": { "url": "..." } }`; data URLs are supported. |
| `input_video` | deprecated | Legacy video content type. |
| `file` | supported | `{ "type": "file", "file": { "file_data": "...", "file_id": "...", "filename": "..." } }`; for document processing. |

## Core Request Parameters

| Parameter | Support | Type / Values | Notes |
|---|---|---|---|
| `model` | supported | `string` | Example: `openai/gpt-4`, `openai/gpt-5.2`. |
| `models` | OpenRouter extension | `array<string>` | Fallback/model routing list. |
| `messages` | required | `array<object>` | Chat messages. |
| `stream` | supported | `boolean` | Default `false`. |
| `stream_options.include_usage` | deprecated/no effect | `boolean` | Current OpenAPI says full usage details are always included. |
| `max_tokens` | supported but deprecated | `integer` | Use `max_completion_tokens`; some providers enforce minimum 16. |
| `max_completion_tokens` | supported | `integer` | Preferred max generated-token field. |
| `stop` | supported | `string` or `array<string>` | OpenAPI max array length is 4. |
| `seed` | supported | `integer` | Determinism is not guaranteed for all models. |
| `user` | supported | `string` | Stable end-user identifier, used for abuse detection. |
| `service_tier` | supported | `auto`, `default`, `flex`, `priority`, `scale`, `null` | Upstream/provider-dependent. |
| `session_id` | supported | `string`, max 256 | Groups related requests for observability; body value overrides `x-session-id` header. |
| `metadata` | supported | object of string pairs | Max 16 pairs, 64-character keys, 512-character values. |
| `trace` | supported | object | Known keys: `trace_id`, `trace_name`, `span_name`, `generation_name`, `parent_span_id`; additional keys pass to broadcast destinations. |

## Sampling And Generation Parameters

| Parameter | Support | Type / Range | Default / Notes |
|---|---|---|---|
| `temperature` | supported | float `0.0` to `2.0` | Default `1.0`. |
| `top_p` | supported | float `0.0` to `1.0` | Default `1.0`. |
| `top_k` | accepted by docs, not in current ChatRequest OpenAPI | integer `>= 0` | Default `0`; parameters page says unavailable for OpenAI models. |
| `frequency_penalty` | supported | float `-2.0` to `2.0` | Default `0.0`. |
| `presence_penalty` | supported | float `-2.0` to `2.0` | Default `0.0`. |
| `repetition_penalty` | accepted by docs, not in current ChatRequest OpenAPI | float `0.0` to `2.0` | Default `1.0`; provider/model-dependent. |
| `min_p` | accepted by docs, not in current ChatRequest OpenAPI | float `0.0` to `1.0` | Default `0.0`; provider/model-dependent. |
| `top_a` | accepted by docs, not in current ChatRequest OpenAPI | float `0.0` to `1.0` | Default `0.0`; provider/model-dependent. |
| `logit_bias` | supported | object token-id -> number | Values typically `-100` to `100`; provider/tokenizer-dependent. |
| `logprobs` | supported | `boolean` | Returns output token log probabilities when supported. |
| `top_logprobs` | supported | integer `0` to `20` | Requires `logprobs: true`. |
| `prediction` | documented in overview, not in current ChatRequest OpenAPI | object | OpenAI-style predicted output for latency optimization. |

## Reasoning Parameters

| Parameter | Support | Type / Values | Notes |
|---|---|---|---|
| `reasoning` | supported | object | Current OpenAPI field for reasoning models. |
| `reasoning.effort` | supported | `xhigh`, `high`, `medium`, `low`, `minimal`, `none`, `null` | Constrains reasoning effort when supported by the model/provider. |
| `reasoning.summary` | supported | enum from OpenAPI | Controls reasoning summary verbosity where supported. |
| `reasoning_effort` | accepted by parameters docs, not in current ChatRequest OpenAPI | `xhigh`, `high`, `medium`, `low`, `minimal`, `none` | OpenAI-style alias/setting. Prefer testing both `reasoning` and `reasoning_effort`. |
| `include_reasoning` | deprecated | `boolean` | Deprecated alias for reasoning inclusion/exclusion behavior. |

## Output Format Parameters

| Parameter | Support | Shape | Notes |
|---|---|---|---|
| `response_format.type=text` | supported | `{ "type": "text" }` | Default text response format. |
| `response_format.type=json_object` | supported | `{ "type": "json_object" }` | JSON mode. Prompt must still ask for JSON. |
| `response_format.type=json_schema` | supported | `{ "type": "json_schema", "json_schema": { "name": "...", "strict": true, "schema": {...} } }` | Structured outputs where model/provider supports it. |
| `response_format.type=grammar` | supported | `{ "type": "grammar", "grammar": "..." }` | Custom grammar response format. |
| `response_format.type=python` | supported | `{ "type": "python" }` | Python code response format. |
| `structured_outputs` | accepted by parameters docs, not in current ChatRequest OpenAPI | `boolean` | Indicates whether model can return `response_format: json_schema`. |

## Tool Calling

| Parameter / Field | Support | Shape / Values | Notes |
|---|---|---|---|
| `tools` | supported | `array<object>` | Supports regular function tools and OpenRouter built-in server tools. |
| `tools[].type=function` | supported | OpenAI function tool | `function.name` required; name max 64 chars. |
| `tools[].function.description` | supported | `string` | Optional. |
| `tools[].function.parameters` | supported | JSON Schema object | Optional in OpenAPI; should be included for useful tests. |
| `tools[].function.strict` | supported | `boolean|null` | Enables strict schema adherence where supported. |
| `parallel_tool_calls` | supported | `boolean|null` | Default from parameters page is `true`; only applies when tools are provided. |
| `tool_choice=none` | supported | `string` | Do not call tools. |
| `tool_choice=auto` | supported | `string` | Model may call tools or answer normally. |
| `tool_choice=required` | supported | `string` | Model must call one or more tools. |
| `tool_choice` named function | supported | `{ "type": "function", "function": { "name": "..." } }` | Forces a specific function. |
| `tool_choice` server tool | supported | OpenRouter server-tool choice | Current OpenAPI includes `ChatServerToolChoice`. |

## OpenRouter Built-In Server Tools

| Tool Type | Support | Notes |
|---|---|---|
| `openrouter:datetime` | supported | Returns current date/time; accepts parameters such as timezone. |
| `openrouter:image_generation` | supported | Generates images from text prompts using a configured image model. |
| `openrouter:experimental__search_models` | supported | Searches/filter models available on OpenRouter. |
| `openrouter:web_fetch` | supported | Fetches full content from a URL or PDF. |
| `openrouter:web_search` | supported | Searches the web for current information. |
| `web_search`, `web_search_preview`, `web_search_preview_2025_03_11`, `web_search_2025_08_26` | supported shorthand | OpenAI Responses-style web search syntax; converted to `openrouter:web_search`. |
| `stop_server_tools_when` | supported | Array of server-tool loop stop conditions; overrides `max_tool_calls` according to OpenAPI description. |

## Modalities And Media Output

| Parameter / Field | Support | Values / Notes |
|---|---|---|
| `modalities` | supported | `text`, `image`, `audio`; provider/model-dependent. |
| `image_config` | supported | Flexible image config; schema allows string, number, or array. |
| `assistant.audio` | supported in response/message schema | Includes base64 `data`, `expires_at`, `id`, `transcript`. |
| `assistant.images` | supported in response/message schema | Image output references/details. |

## Plugins

| Plugin ID | Support | Notes |
|---|---|---|
| `auto-router` | supported | Cost/quality routing; supports `allowed_models`, `cost_quality_tradeoff`, `enabled`. |
| `moderation` | supported | Guardrail/moderation plugin. |
| `web` | supported | Real-time web search plugin; supports domain filters, search engine, max results, user location. |
| `web-fetch` | supported | URL/PDF fetch plugin with allowed/blocked domains and use/content limits. |
| `file-parser` | supported | PDF/document parsing; current OpenAPI includes PDF parser options. |
| `response-healing` | supported | Automatic response repair, useful for structured output. |
| `context-compression` | supported | Prompt/context compression, including `middle-out` engine. |
| `pareto-router` | supported | Coding-score routing plugin. |
| `fusion` | supported | Multi-model analysis plus judge/synthesis plugin; can amplify cost. |

## Provider Routing

| Field | Support | Notes |
|---|---|---|
| `provider.allow_fallbacks` | supported | Default true; false restricts to primary/custom provider and returns upstream error if unavailable. |
| `provider.order` | supported | Ordered provider slug preference list. |
| `provider.only` | supported | Allow-list provider slugs. |
| `provider.ignore` | supported | Ignore-list provider slugs, merged with account-wide settings. |
| `provider.require_parameters` | supported | If true, filters to providers that support all supplied parameters. If false/omitted, unsupported provider params may be dropped/ignored. |
| `provider.sort` | supported | Sort strategy if `order` is not specified; no load balancing when set. |
| `provider.quantizations` | supported | Filters by quantization level. |
| `provider.max_price` | supported | Max USD price per prompt/completion/audio/image/request unit. |
| `provider.data_collection` | supported | `allow`, `deny`, `null`; `deny` routes only to providers that do not collect user data. |
| `provider.zdr` | supported | Restricts to zero-data-retention endpoints. |
| `provider.enforce_distillable_text` | supported | Restricts to models that allow text distillation. |
| `provider.preferred_max_latency` | supported | Latency preference. |
| `provider.preferred_min_throughput` | supported | Throughput preference. |
| `route` | deprecated | `fallback`; older OpenRouter routing field. Prefer `models` / `provider`. |

## Cache, Debug, And Observability

| Field | Support | Notes |
|---|---|---|
| `cache_control` | supported | Top-level Anthropic-style prompt caching directive; currently supported for Anthropic Claude models. |
| content-part `cache_control` | supported | Can be attached to `text` content parts. |
| `debug.echo_upstream_body` | supported, streaming only | Includes transformed upstream request body in a debug chunk at stream start. |
| `metadata` | supported | Request metadata. |
| `trace` | supported | Observability/tracing metadata. |
| `session_id` | supported | Groups requests for observability. |
| `X-OpenRouter-Experimental-Metadata: enabled` | supported | Adds `openrouter_metadata` with routing context. |

## Response Fields

| Field | Support | Type / Notes |
|---|---|---|
| `id` | supported | Required response id. |
| `choices` | supported | Array of chat choices. |
| `created` | supported | Unix timestamp. |
| `model` | supported | Model used, e.g. `openai/gpt-4`. |
| `object` | supported | `chat.completion`. |
| `system_fingerprint` | supported | Required by OpenAPI, nullable. |
| `service_tier` | supported | Upstream provider service tier, nullable. |
| `usage` | supported | Token and cost usage. |
| `openrouter_metadata` | opt-in | Present when metadata header is enabled and available. |

## Choice And Assistant Response Fields

| Field | Support | Notes |
|---|---|---|
| `choices[].finish_reason` | supported | Enum from OpenAPI; test provider-specific values as pass-through risk. |
| `choices[].index` | supported | Choice index. |
| `choices[].message.role` | supported | `assistant`. |
| `choices[].message.content` | supported | String, array content, or null. |
| `choices[].message.tool_calls` | supported | Function/server tool calls. |
| `choices[].message.reasoning` | supported | Reasoning output string. |
| `choices[].message.reasoning_details` | supported | Structured reasoning details. |
| `choices[].message.refusal` | supported | Refusal text if content refused. |
| `choices[].message.audio` | supported | Audio output payload/reference. |
| `choices[].message.images` | supported | Image output details. |
| `choices[].logprobs` | supported | Token logprobs if requested and supported upstream. |

## Usage Fields

| Field | Support | Notes |
|---|---|---|
| `usage.prompt_tokens` | supported | Required. |
| `usage.completion_tokens` | supported | Required. |
| `usage.total_tokens` | supported | Required. |
| `usage.prompt_tokens_details.cached_tokens` | supported | Cached prompt tokens. |
| `usage.prompt_tokens_details.cache_write_tokens` | supported | Cache write tokens for models with explicit caching/pricing. |
| `usage.prompt_tokens_details.audio_tokens` | supported | Audio input tokens. |
| `usage.prompt_tokens_details.video_tokens` | supported | Video input tokens. |
| `usage.completion_tokens_details.reasoning_tokens` | supported | Reasoning token count. |
| `usage.completion_tokens_details.audio_tokens` | supported | Audio output tokens. |
| `usage.completion_tokens_details.accepted_prediction_tokens` | supported | Prediction tokens accepted. |
| `usage.completion_tokens_details.rejected_prediction_tokens` | supported | Prediction tokens rejected. |
| `usage.cost` | OpenRouter extension | Completion cost. |
| `usage.cost_details` | OpenRouter extension | Upstream prompt/completion/inference cost details. |
| `usage.is_byok` | OpenRouter extension | Whether BYOK was used. |

## Error Status Support

| Status | Meaning |
|---|---|
| `400` | Bad request / invalid parameters / malformed input. |
| `401` | Missing or invalid authentication. |
| `402` | Insufficient credits or quota. |
| `403` | Permission issue or guardrail block; metadata header may add routing/guardrail context. |
| `404` | Resource not found. |
| `408` | Request timeout. |
| `413` | Payload too large. |
| `422` | Semantic validation failure. |
| `429` | Rate limit exceeded. |
| `500` | Internal server error. |
| `502` | Provider/upstream API failure. |
| `503` | Service unavailable. |

## Compatibility Test Implications

| Group | Fields To Test |
|---|---|
| Required / defaults | `messages`, omitted `model`, explicit `model` |
| Sampling | `temperature`, `top_p`, `top_k`, `frequency_penalty`, `presence_penalty`, `repetition_penalty`, `min_p`, `top_a`, `seed`, `logit_bias` |
| Length | `max_completion_tokens`, deprecated `max_tokens` |
| Debug | `logprobs`, `top_logprobs`, `debug.echo_upstream_body` |
| Output | `response_format` variants: `text`, `json_object`, `json_schema`, `grammar`, `python` |
| Reasoning | `reasoning`, `reasoning_effort`, `include_reasoning`, response `reasoning`, `reasoning_details`, `usage.completion_tokens_details.reasoning_tokens` |
| Tools | function tools, `strict`, `tool_choice`, `parallel_tool_calls`, built-in server tools, `stop_server_tools_when` |
| Multimodal | image input, audio input/output, video input, file input, `modalities`, `image_config` |
| Routing | `models`, deprecated `route`, `provider.*`, `provider.require_parameters` |
| Plugins | `web`, `web-fetch`, `file-parser`, `response-healing`, `context-compression`, `auto-router`, `pareto-router`, `fusion`, `moderation` |
| Observability | `metadata`, `trace`, `session_id`, `openrouter_metadata`, cost fields |

Important compatibility caveats:

- OpenRouter normalizes schemas across many upstream providers; request acceptance by OpenRouter is not the same as support by every selected provider/model.
- Use `provider.require_parameters: true` when a test must prove the selected upstream supports every supplied parameter.
- Parameters page says OpenRouter may forward provider-specific parameters not shown in ChatRequest OpenAPI.
- Some documented parameter-page fields (`top_k`, `repetition_penalty`, `min_p`, `top_a`, `reasoning_effort`, `verbosity`, `web_search_options`, `structured_outputs`, `prediction`) are not present in the current `ChatRequest` OpenAPI schema; classify these as docs-supported/provider-dependent until verified.
- `stream_options.include_usage` is deprecated/no-op in current OpenAPI.
- `max_tokens` is deprecated in favor of `max_completion_tokens`.
