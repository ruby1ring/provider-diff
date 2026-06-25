# Capacity Probe Methodology

This project measures two model capacity indicators with generated capacity test cases over common K/M tiers:

- `max_output`: the largest accepted output budget parameter for a model and endpoint.
- `total_context`: the largest accepted total context budget for a model and endpoint.

The probe is implemented by `scripts/probe-capacity.js`. It turns each common tier into a single test case attempt with a stable `case_id`, runs tiers from large to small, and records request size, HTTP status, support conclusion, provider usage fields, finish reason, latency, and provider error text. K/M labels use 1024 units: `128k = 131072`, `1m = 1048576`.

## Test Case Types

### `max_output_boundary`

Goal: measure the largest common tier accepted by the provider's output length parameter.

Payload shape:

- Chat Completions: `messages=[{role:"user", content:"Reply exactly: OK"}]`.
- Anthropic Messages: `messages=[{role:"user", content:"Reply exactly: OK"}]`.
- Output parameter:
  - `max_completion_tokens` for OpenAI-style providers that use the newer OpenAI field.
  - `max_tokens` for providers that use legacy OpenAI-compatible or Anthropic Messages fields.

Interpretation:

- This is an output budget acceptance test.
- It proves the endpoint accepts the requested common tier.
- It does not prove the model actually generated that many output tokens.
- Actual generated tokens are recorded from `usage` when available.

### `total_context_boundary`

Goal: measure the largest accepted common total context tier.

Payload shape:

- Use a small output budget, default `8`.
- For a candidate total context tier `N`, subtract a safety margin before generating deterministic filler.
- The default safety margin is `5%` of the candidate tier.
- Example: the `256k` tier is displayed and concluded as `256k`, but the request is built at about `243.2k` total context.
- Ask the model to ignore the filler and reply `OK`.

Interpretation:

- Candidate values represent estimated total context tokens, not just input tokens.
- The structured conclusion stays on common tiers such as `128k`, `256k`, `512k`, and `1m`.
- Attempt details include `tested_total_context_tokens` and `tested_total_context_display`, which show the lower, safety-margin-adjusted size that was actually sent.
- Provider-counted `usage.prompt_tokens`, `usage.input_tokens`, `usage.total_tokens`, or equivalent fields are recorded when available.
- Because tokenizers vary, the report includes the display tier, the tested size, and provider-counted usage.

## Boundary Rule

Candidates are ordered from large to small.

The probe finds a common-tier boundary. A capacity boundary is considered found only when:

1. One or more higher candidates are non-supported.
2. A lower candidate is supported.
3. The supported candidate is the largest supported candidate in the tested ladder.

Provider error text may include an exact maximum, but the structured capacity conclusion stays on common tiers such as `128k`, `256k`, `512k`, `1m`, and `2m`.

The report fields are:

- `capacity_display.最大Max Output`: Chinese display conclusion for the maximum common output tier.
- `capacity_display.最大Total Context`: Chinese display conclusion for the maximum common total context tier.
- `supported_max_display`: largest supported common tier in K/M form.
- `upper_bound_found`: true when a higher non-supported candidate brackets `supported_max`.
- `nearest_higher_non_supported.candidate_display`: the closest tested higher tier that failed or was rejected.
- `tested_total_context_display`: for Total Context attempts, the safety-margin-adjusted context size actually sent for that display tier.
- `context_safety_margin_percent`: configured Total Context safety margin, default `5`.
- `top_candidate_supported`: true when the largest configured candidate passed; in that case the upper bound was not found and the ladder should be expanded upward.
- `non_monotonic_results`: true when lower candidates fail after a higher candidate passed; this usually means transient provider errors or non-length-related instability.
- `stop_reason`: why the probe stopped.

Default behavior stops after the boundary is bracketed. Use `--exhaustive` to run every configured candidate even after a boundary is found.

## Concurrency

Capacity probes support target-level concurrency with `--max-concurrency`.

- Different provider/model targets can run concurrently.
- Candidate tiers inside the same provider/model target run sequentially from large to small.
- Sequential tiers preserve the boundary rule and avoid unnecessary large-context requests after a boundary has already been bracketed.
- For expensive Total Context probes, keep concurrency low to avoid rate limits and quota spikes.

## Conclusions

Use these result rules:

- `upper_bound_found=true`: report `supported_max_display` as the measured maximum common tier for the configured ladder.
- `top_candidate_supported=true`: do not call `supported_max` a true maximum. Expand candidates upward and retest.
- `supported_max=null`: no candidate in the configured ladder was supported. Check auth, permissions, model name, endpoint, or lower candidates.
- `auth_or_permission_failed`: not a model capacity result.
- `rate_limited`, `server_error`, or `request_failed`: retry before drawing a capacity conclusion.
- `non_monotonic_results=true`: rerun the affected provider/model with retries or `--exhaustive`; do not use the result as a clean boundary.

## Recommended Commands

Probe one model:

```sh
node scripts/probe-capacity.js \
  --providers deepseek \
  --model deepseek=deepseek-v4-flash \
  --probes output,context
```

Probe only Max Output:

```sh
node scripts/probe-capacity.js \
  --providers minimax \
  --model minimax=MiniMax-M2.7 \
  --probes output
```

Probe only Total Context with a custom ladder:

```sh
node scripts/probe-capacity.js \
  --providers ali \
  --model ali=deepseek-v4-pro \
  --probes context \
  --context-candidates 1m,512k,256k,128k
```

Run every candidate even after a boundary is bracketed:

```sh
node scripts/probe-capacity.js \
  --providers siliconflow \
  --model siliconflow=Pro/zai-org/GLM-4.7 \
  --probes output \
  --exhaustive
```

Run several provider/model targets concurrently:

```sh
node scripts/probe-capacity.js \
  --providers ali,deepseek,minimax \
  --probes output \
  --max-concurrency 3
```
