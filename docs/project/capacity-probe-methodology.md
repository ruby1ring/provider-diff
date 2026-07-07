# Capacity Probe Methodology

This project measures model capacity / limit indicators with generated capacity test cases over common K/M tiers. The four 模型限制 metrics from a provider's model card map to these probe kinds, each answered along three axes — **是否支持传 (accept)** / **传了是否生效 (effective)** / **最大能传多少 (max)**:

| 模型限制 (screenshot) | Probe kind(s) | accept | effective | max |
| --- | --- | --- | --- | --- |
| 最大输出长度 | `max_output` + `max_output_effective` | HTTP 2xx at a tier | `max_output_effective`: output truncated (`finish_reason=length`, `completion_tokens≈cap`) | `max_output`: largest accepted tier |
| 上下文长度 | `total_context` (balanced) | HTTP 2xx at a tier | n/a (acceptance) | largest accepted tier |
| 最大输入长度 | `max_input` | HTTP 2xx at a tier | n/a (acceptance) | largest accepted input tier |
| 最大思考长度 | `thinking_budget` | budget field returns 2xx | `reasoning_tokens` scales with budget | largest accepted budget |

The probe is implemented by `scripts/probe-capacity.js` (CLI) and mirrored in the Go backend (`backend/main.go`, `capacityProbeSpec` / `runCapacityProbeCase`) for the Web 实测 cases. It turns each common tier into a single test case attempt with a stable `case_id`, runs tiers from large to small, and records request size, HTTP status, support conclusion, provider usage fields, finish reason, completion/reasoning tokens, latency, and provider error text. K/M labels use 1024 units: `128k = 131072`, `1m = 1048576`.

Documented baselines for 上下文长度 / 最大输出长度 come from OpenRouter (shown in the 测评模型 model-intro drawer). 最大输入长度 and 最大思考长度 have no documented source and are measurement-only.

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

#### Balanced vs input-heavy context

Older context probing piled almost the entire tier into the input prompt. When a model's **input cap is lower than its context window** (e.g. 96K input cap but 128K context), the input-heavy probe gets clipped by the input limit and under-reports context as ~96K.

The default (CLI) and recommended mode is **balanced**:

- Run `max_input` and `max_output` first to learn each cap.
- For a context tier `N`, split it into `output = min(maxOutput, N-1)` and `input = min(maxInput, N-output)` so neither individual limit is exceeded while the total still approaches the real context window.
- The report marks `context_method: "balanced"` and records `balanced_max_input_tokens` / `balanced_max_output_tokens`.

Use `--no-context-balanced` to fall back to the legacy **input-heavy** mode (`context_method: "input_heavy"`). In the Web 实测 cases the context probe runs input-heavy because each case runs independently without a measured cap to split against; use the CLI for balanced context.

### `max_input_boundary`

Goal: measure the largest accepted **input** length, independent of the total context window.

Payload shape:

- Large deterministic filler sized to the candidate tier (minus the same `5%` safety margin), with a small fixed output budget (`16`).
- Find the largest input tier the provider accepts; rejection error text often contains the exact input ceiling.

Interpretation: this isolates the input ceiling from `total_context`, which is what makes balanced context probing possible.

### `max_output_effective`

Goal: prove the output-length parameter actually **truncates** generation rather than being silently ignored.

Payload shape:

- A prompt that forces a long, continuous generation ("keep writing until cut off").
- Small caps (default `512`, `64`).

Effective when `finish_reason ∈ {length, max_tokens, max_output_tokens, output_limit, model_length}`, ideally with `completion_tokens ≈ cap`. If the model stops early on its own (`finish_reason=stop`) the cap is treated as not proven effective. Report fields: `effective`, `effective_detail`.

### `thinking_budget`

Goal: for reasoning models, test the per-provider thinking-budget field on all three axes.

Provider dialects:

| Dialect field | Providers |
| --- | --- |
| `thinking_budget` (+ `enable_thinking: true`) | Qwen / SiliconFlow / 阿里百炼 / Kimi / vLLM-style (documented range `[128, 32768]`) |
| `thinking.budget_tokens` | Claude (messages); DeepSeek documents it as Ignored — verified by probe; Zhipu best-effort |
| `reasoning.max_tokens` | OpenRouter |
| _none_ | MiniMax (only a `reasoning_split` switch) → reported as N/A / skipped |

Method:

- **accept**: the budget field returns 2xx.
- **max**: descending budget ladder (default `32768 → 128`) finds the largest accepted budget.
- **effective**: a hard reasoning prompt; compare `reasoning_tokens` across budgets — effective when the highest accepted budget yields more `reasoning_tokens` than the lowest. `budget_respected=false` flags attempts where `reasoning_tokens` exceeded the requested budget.
- Only runs when the model supports reasoning (Web case is gated by `requires_model_capability: "reasoning"`; CLI skips providers with no budget field). The thinking-budget probe ladder is run exhaustively (no early boundary stop) so effectiveness can be compared across budgets.

## Boundary Rule

Candidates are ordered from large to small.

The probe finds a common-tier boundary. A capacity boundary is considered found only when:

1. One or more higher candidates are non-supported.
2. A lower candidate is supported.
3. The supported candidate is the largest supported candidate in the tested ladder.

Provider error text may include an exact maximum, but the structured capacity conclusion stays on common tiers such as `128k`, `256k`, `512k`, `1m`, and `2m`.

The report fields are:

- `capacity_display.最大Input` / `最大Max Output` / `Max Output 生效` / `最大Total Context` / `最大Thinking Budget`: Chinese display conclusions per metric.
- `supported_max_display`: largest supported common tier in K/M form (for `max_input` / `max_output` / `total_context`).
- `effective` / `effective_detail`: for `max_output_effective` (and `thinking_budget`).
- `budget_accepted` / `budget_max_display` / `budget_respected` / `thinking_field` / `thinking_low_reasoning_tokens` / `thinking_high_reasoning_tokens`: for `thinking_budget`.
- `context_method`: `balanced` or `input_heavy` for `total_context`.
- `upper_bound_found`: true when a higher non-supported candidate brackets `supported_max`.
- `nearest_higher_non_supported.candidate_display`: the closest tested higher tier that failed or was rejected.
- `tested_total_context_display`: for Total Context attempts, the safety-margin-adjusted context size actually sent for that display tier.
- `context_safety_margin_percent`: configured Total Context safety margin, default `5`.
- `top_candidate_supported`: true when the largest configured candidate passed; in that case the upper bound was not found and the ladder should be expanded upward.
- `non_monotonic_results`: true when lower candidates fail after a higher candidate passed; this usually means transient provider errors or non-length-related instability.
- `stop_reason`: why the probe stopped.

Default behavior stops after the boundary is bracketed. Use `--exhaustive` to run every configured candidate even after a boundary is found.

## V02 输出长度分组

Run V0.2 测评工具新增 **「输出长度」** case 分组，与模型介绍抽屉中的 **Context** / **Max completion**（OpenRouter 基线）对照使用。

### 子分组与默认选择

输出长度 case 按 **六轴** 组织（UI 分区展示）：

| 轴 | 含义 | 默认勾选 |
| --- | --- | --- |
| 接受性 | 各字段单独传参，验证 HTTP 200 接受 | 是 |
| 生效性 | `cap=64` + 强制长输出，验证真截断 | 是 |
| 双参优先级 | `max_tokens=64` + `max_completion_tokens=512` 同时传 | 是 |
| 与 stop 组合 | 输出上限字段 + `stop` 同时传 | 否 |
| 兼容 / 边缘 | 废弃字段、null、vLLM 兼容别名 | 否 |
| 容量边界 | 最大输入/输出/总上下文爬升探测 | 否 |

核心对比逻辑（判断两字段含义是否一致）：

1. **接受性**：`030_length_max_tokens` + `030_length_max_completion_tokens`（各 1 case）
2. **生效性**：`033_length_max_*_only_effective`（各 1 case）
3. **双参优先级**：`032_length_both_fields_precedence`（1 case）

`capacity_max_output_effective` 与 033 生效性重复，**不再注入** V02 输出长度分组。

P2 边界探测耗时较长；跑完后执行 `npm run build:model-limits` 可将结果写入 `web/data/model-limits-observed.json`。

### 双参优先级（`output_length_cap_precedence`）

当同一请求同时传入 `max_tokens` 与 `max_completion_tokens`（如 `64` vs `512`）并强制长输出时，runner 根据 `finish_reason` 与 `completion_tokens` 判定实际生效字段：

| Profile | 含义 |
| --- | --- |
| `max_tokens` | 输出截断于 `max_tokens` |
| `max_completion_tokens` | 输出截断于 `max_completion_tokens` |
| `min_wins` | 截断于两参较小值 |
| `rejected` | HTTP 400，双参互斥或拒绝 |
| `single_field_only` | 请求仅含一个长度字段 |
| `inconclusive` | 自然 stop 或未截断，无法判定 |

Case expect 使用 `output_length_cap_precedence: "observed"`（始终 pass，供横向对比）。单字段生效性由 `033_length_*_only_effective` 与 `output_cap_effective` 记录。

### 单参生效性与语义对比

对每个渠道分别跑：

1. **仅 `max_tokens=64`**（`033_length_max_tokens_only_effective`）— 若 `finish_reason=length` 且 `completion_tokens≈64`，说明该字段控制输出上限。
2. **仅 `max_completion_tokens=64`**（`033_length_max_completion_tokens_only_effective`）— 同上判定。
3. **双参 `max_tokens=64` + `max_completion_tokens=512`**（`032_length_both_fields_precedence`）— 判定同时传入时哪个优先（`output_length_cap_precedence`）。

横向对比可得出结论：

| 观测 | 推断 |
| --- | --- |
| 两单参 case 均截断于 64 | 两字段**含义一致**（等价别名） |
| 仅一个单参 case 截断 | 仅该字段生效，另一字段被忽略或拒绝 |
| 双参 case 截断于 64 | `max_tokens` 优先或 min-wins |
| 双参 case 截断于 512 | `max_completion_tokens` 优先 |
| 双参 400 | 互斥，不可同时传 |

`max_tokens` 与 `max_completion_tokens` 在 OpenAI 新协议中均指 **completion 输出 token 上限**（不含 prompt）；若某渠道将 `max_tokens` 计为 prompt+completion 总预算，则与 canonical 语义不同，会表现为单参截断阈值或 `completion_tokens` 计数与 cap 不一致。

### 渠道 canonical 输出字段

| Provider | 探测主字段 | 备注 |
| --- | --- | --- |
| openai, claude, minimax, openrouter | `max_completion_tokens` | `max_tokens` deprecated |
| deepseek, siliconflow, ali | `max_tokens` | 部分渠道文档推荐 `max_completion_tokens` |
| vllm | 两者皆测 | 版本相关 |

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

Measure all four 模型限制 metrics for one model (balanced context needs `input` + `output` first):

```sh
node scripts/probe-capacity.js \
  --providers siliconflow \
  --model siliconflow=Pro/zai-org/GLM-4.7 \
  --probes input,output,output-effective,thinking-budget,context
```

## Surfacing measured vs documented (测评模型)

`scripts/build-model-limits-observed.mjs` aggregates capacity-probe reports (CLI `targets[].probes` reports and UI-exported run reports) into `web/data/model-limits-observed.json`, keyed by channel → model → metrics. Rebuild with:

```sh
npm run build:model-limits
# or: node scripts/build-model-limits-observed.mjs --input outputs/capacity-probes/
```

The 测评模型 model-intro drawer loads it via `web/lib/model-limits-observed-runtime.js` and renders a **各渠道实测限制（Noctua）** table that compares the measured four metrics against the documented OpenRouter Context / Max completion baseline.
