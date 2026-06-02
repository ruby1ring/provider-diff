# Provider Usage Fields

This document centralizes the `usage` fields that the provider-diff cases should assert. Provider-specific docs still live in the individual provider notes; this file is the quick matrix for test-case maintenance.

## Test Policy

Every Chat Completions provider should have both cases:

| Case type | Required request shape | Expected assertion target |
|---|---|---|
| Non-stream usage | `stream` omitted or `false` | Response body `usage` object. |
| Stream usage | `stream: true` plus provider-supported usage option | SSE usage chunk or streamed response usage object. |

For non-stream responses, assert the stable fields documented and observed for the provider. For streaming responses, assert `usage` only when the provider documents or supports a final usage chunk. Normal content chunks may still contain `usage: null`.

## Provider Matrix

| Provider | Stream usage option | Stable required usage fields | Provider-specific usage fields to track |
|---|---|---|---|
| OpenAI | `stream_options.include_usage: true` | `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` | `usage.prompt_tokens_details.cached_tokens`, `usage.prompt_tokens_details.audio_tokens`, `usage.completion_tokens_details.reasoning_tokens`, `usage.completion_tokens_details.audio_tokens`, `usage.completion_tokens_details.accepted_prediction_tokens`, `usage.completion_tokens_details.rejected_prediction_tokens` |
| DeepSeek | `stream_options.include_usage: true` | `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` | `usage.prompt_cache_hit_tokens`, `usage.prompt_cache_miss_tokens`, `usage.completion_tokens_details.reasoning_tokens` |
| Aliyun Bailian / DashScope | `stream_options.include_usage: true` | `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` | Model-family-specific fields may vary; keep extension fields observational unless the selected model documents them. |
| MiniMax | `stream_options.include_usage: true` | `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`, `usage.total_characters` | `usage.prompt_tokens_details.cached_tokens`, `usage.completion_tokens_details.reasoning_tokens` when the selected model/mode returns reasoning accounting |
| SiliconFlow | `stream_options.include_usage: true` | `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`, `usage.prompt_cache_hit_tokens`, `usage.prompt_cache_miss_tokens` | `usage.completion_tokens_details.reasoning_tokens`, `usage.prompt_tokens_details.cached_tokens` |
| OpenRouter | Current OpenAPI marks `stream_options.include_usage` deprecated/no-op because full usage details are included | `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` | `usage.cost`, `usage.cost_details`, `usage.is_byok`, `usage.prompt_tokens_details.cache_write_tokens`, audio/video/detail fields depending on upstream provider |

## Assertion Notes

- Use `usage_required_fields` in case `expect` blocks for both stream and non-stream cases.
- Dotted paths are supported, for example `completion_tokens_details.reasoning_tokens`.
- Do not require optional/detail fields that are model-family dependent unless the case selects a model that reliably emits them.
- For stream usage tests, the runner checks SSE events and accepts the first event whose JSON payload has a non-null `usage` object.
- For rejected or permission-limited cases, matching the expected support conclusion and HTTP status is enough; usage assertions are only meaningful for successful usage cases.
