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

## Streaming Usage Chunk Shape

Beyond checking that a `usage` object exists, case `*_protocol_stream_usage_chunk_shape` / `*_stream_usage_chunk_shape` (P1.5) validates **how** usage is placed in the SSE sequence when `stream_options.include_usage=true`.

### OpenAI-compatible standard (`openai_dedicated`)

When `expect.stream_usage_chunk_shape` is `openai_dedicated`, the runner requires:

1. A dedicated final data chunk before `data: [DONE]` with `choices: []` and a non-null `usage` object.
2. `finish_reason` must **not** appear in the same chunk as the real `usage` object.
3. The stream must end with `data: [DONE]`.

Typical compliant sequence:

```
data: {"choices":[{"delta":{"content":"..."}}],"usage":null}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":null}
data: {"choices":[],"usage":{"prompt_tokens":...,"completion_tokens":...,"total_tokens":...}}
data: [DONE]
```

### Observed profiles (`stream_usage_chunk_profile`)

All stream SSE runs populate `stream_usage_chunk_profile` for cross-channel comparison:

| Profile | Meaning |
|---|---|
| `dedicated` | Compliant: usage in a separate chunk with `choices: []`. |
| `merged_finish_reason` | Non-compliant: same chunk carries both `finish_reason` and `usage` (observed on DeepSeek official API). |
| `missing` | No chunk contains a real `usage` object. |
| `other` | `usage` exists but not in an empty-choices dedicated chunk and not merged with `finish_reason`. |

Case IDs: `ali_protocol_stream_usage_chunk_shape`, `deepseek_protocol_stream_usage_chunk_shape`, `oa_stream_usage_chunk_shape`, `sf_stream_usage_chunk_shape`, `minimax_protocol_stream_usage_chunk_shape`, `claude_protocol_stream_usage_chunk_shape`, `vllm_protocol_stream_usage_chunk_shape`, `or_stream_usage_chunk_shape`.

Use `stream_usage_chunk_shape: "observed"` when you only want to record the profile without failing non-standard shapes.

## Cache Hit Rate Evaluation (V0.2)

Cross-channel cache hit rate probes live in **测评工具 V0.2 → 缓存命中率**. They use synthetic `custom_cases` with `payload.__cache_probe` and read the cache-related usage fields above on the **second** identical request.

See [docs/project/cache-probe-methodology.md](../project/cache-probe-methodology.md) for warmup/measure flow, case kinds (`passive`, `prompt_cache_key`, `cache_control`), observational vs `min_hit_rate: 0.85` threshold cases, hit-rate formula, and warning semantics when `hit_tokens = 0`.
