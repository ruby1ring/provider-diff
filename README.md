# Noctua

**Noctua** is an LLM provider protocol compatibility and gateway policy testing tool. It runs structured cases against OpenAI-compatible (and provider-specific) Chat Completions APIs to show which parameters are supported, rejected, or silently ignored, and how response shapes differ from the baseline.

This repository’s internal name remains **provider-diff** for Docker images, Compose services, CI, and the embedded backend binary. The product-facing name (Web UI, macOS app, reports) is **Noctua**.

Product requirements for the compatibility testing flow: [prd.md](prd.md).

## Naming

| Context | Name |
| --- | --- |
| Product, Web UI, macOS `.app`, exported reports | **Noctua** |
| Git repository, npm package, Docker image / Compose service | `provider-diff` |
| Embedded backend process binary | `provider-diff-backend` |
| macOS Bundle ID (desktop app) | `cn.siliconflow.noctua` |

## Quick start

Start the static frontend and Go backend locally:

```sh
npm run dev
```

Open http://127.0.0.1:4173/web/ (or the URL printed by the dev script). Choose a provider, enter an API key in the browser, and run compatibility cases.

Requirements: Node.js (for `npm`), Python 3 (`http.server`), and Go (for `go run` in `backend/`).

## Local configuration

API keys stay on your machine and are not committed. To use a local config file for non-UI tooling:

```sh
cp config.example.yaml config.yaml
```

Replace the placeholder API keys in `config.yaml`. The file is listed in `.gitignore` and is not pushed to GitHub.

Channel keys used by **测评模型 → 查询渠道** (live model list lookup). Section names match **测评渠道** platform ids in `web/lib/channel-catalog.js`:

| `config.yaml` section | 测评渠道 |
| --- | --- |
| `deepseek` | DeepSeek 开放平台 |
| `moonshot` | Moonshot 开放平台 |
| `zhipu` | 智谱开放平台 |
| `minimax` | MiniMax 开放平台 |
| `aliyun-cn` | 阿里云百炼（中国-华北 2） |
| `aliyun-us` | 阿里云百炼（美国-弗吉尼亚） |
| `siliconflow-cn` | SiliconFlow CN |
| `siliconflow-com` | SiliconFlow COM |
| `openrouter` | OpenRouter |
| `sf-router-cn` | SF Silinex CN |
| `sf-router-com` | SF Silinex COM |
| `streamlake-cn` | 快手万擎（StreamLake） |
| `baidu-qifan` | 百度千帆（ModelBuilder v2，OpenAI 兼容） |

Legacy section names (`ali`, `siliconflow`, `streamlake`, `baidu`) are still accepted as fallbacks for scripts. Environment variables (e.g. `SILICONFLOW_API_KEY`, `WQ_API_KEY` for StreamLake, `QIANFAN_API_KEY` for 百度千帆) are used when no matching section is found.

## Capacity / model-limit probes

The capacity probe measures the four 模型限制 metrics from a provider's model card — 最大输入长度 / 最大输出长度 / 上下文长度 / 最大思考长度 — each on three axes: **是否支持传 (accept)** / **传了是否生效 (effective)** / **最大能传多少 (max)**.

```sh
node scripts/probe-capacity.js
```

The probe reads `config.yaml`, uses each provider manifest's default model, tries common K/M tiers from large to small, and writes a timestamped JSON report under `outputs/capacity-probes/`. Each tier is emitted as a capacity test case with a stable `case_id`.

Probe kinds (`--probes`, default `output,context`):

- `output` (`max_output`) — largest accepted output budget tier.
- `output-effective` (`max_output_effective`) — forces a long generation at small caps and checks the output is actually truncated (`finish_reason=length`, `completion_tokens≈cap`), proving `max_tokens` really takes effect.
- `input` (`max_input`) — largest accepted input length, independent of the context window.
- `context` (`total_context`) — largest accepted total context tier. **Balanced by default**: when `input` and `output` are probed first, each context tier is split into input/output below the measured caps so a context that exceeds the input cap can still be reached (`--no-context-balanced` for the legacy input-heavy mode).
- `thinking-budget` (`thinking_budget`) — for reasoning models only: tests the per-provider thinking-budget field (`thinking_budget` / `thinking.budget_tokens` / `reasoning.max_tokens`; MiniMax has none) for acceptance, max accepted value, and whether `reasoning_tokens` scale with the budget.

Useful options:

```sh
node scripts/probe-capacity.js --providers openai,deepseek
node scripts/probe-capacity.js --endpoint-id all --providers claude,openrouter
node scripts/probe-capacity.js --providers siliconflow --model siliconflow=Pro/zai-org/GLM-4.7 --probes input,output,output-effective,thinking-budget,context
node scripts/probe-capacity.js --providers vllm --model vllm=Qwen/Qwen3-8B --context-candidates 512k,256k,128k
node scripts/probe-capacity.js --providers ali,deepseek,minimax --max-concurrency 3
node scripts/probe-capacity.js --dry-run
```

`max_output` / `max_input` / `total_context` are acceptance probes for common tiers; they confirm the largest requested tier the endpoint accepts, not that the model generated that many tokens (`max_output_effective` covers actual truncation). `total_context` keeps the conclusion on common tiers such as `128k`, `256k`, and `1m`, but the actual long prompt is built with a proportional safety margin (default `5%`) to avoid tokenizer and message-wrapper edge effects; attempt details include `tested_total_context_display` and provider `usage` when available. K/M labels use 1024 units: `128k = 131072`, `1m = 1048576`. The default mode stops after a tier boundary is bracketed; `--exhaustive` forces every tier. Target-level concurrency is available with `--max-concurrency` (tiers inside one target stay sequential).

To surface measured-vs-documented limits in the 测评模型 model-intro drawer, aggregate reports into `web/data/model-limits-observed.json`:

```sh
npm run build:model-limits
```

See `docs/project/capacity-probe-methodology.md` for the full methodology, provider thinking-budget dialects, balanced context, and result interpretation rules.

## Generated outputs

Files under `outputs/` are not committed. See [outputs/README.md](outputs/README.md).

To regenerate the optional startup baseline import bundle:

```sh
node scripts/run-original-baselines.js
```

## macOS desktop (Noctua)

Build a self-contained macOS app with the UI and embedded Go backend. **These commands run only on macOS**.

**Requirements:** macOS, Node.js, Go, Xcode Command Line Tools (`iconutil`).

### Production DMG

```sh
npm install
npm run dist:dmg
```

Output: `dist/Noctua-<version>-<arch>.dmg`.

The app starts its own backend on a free `127.0.0.1` port and passes that URL into the UI. Docker Compose is not required.

Unsigned local builds may be blocked on first launch; use **right-click → Open** if Gatekeeper warns.

GitHub Actions also builds the DMG from the `Release DMG` workflow on pushes to `main` or manual runs from `main`. Each successful run uploads a temporary workflow artifact named `Noctua-macOS-DMG`. Pushes to `main`, or manual runs with `publish_release=true`, replace the fixed `latest` GitHub Release with one asset named `Noctua-latest-macOS.dmg`, so the public download URL stays stable: `https://github.com/ruby1ring/provider-diff/releases/download/latest/Noctua-latest-macOS.dmg`.

**Bundle ID:** `cn.siliconflow.noctua`.

### Local smoke test (no DMG)

```sh
npm run desktop:dev
```

### Optional bundled services

EvalScope and OpenCompass are not in the DMG by default. The shell can start bundled executables when present at package time:

- `desktop/services/evalscope-service`
- `desktop/services/opencompass-service`

If they are missing, the EvalScope / OpenCompass tabs use external URLs (same as the web dev flow).

## Docker Compose

Start the **provider-diff** stack (Noctua UI + Go API + EvalScope + OpenCompass):

```sh
docker compose up --build
```

Open http://localhost:4173/web/.

If Docker Hub is slow or blocked, pin local base images:

```sh
GO_BASE_IMAGE=golang:1.24.8-alpine \
PYTHON_BASE_IMAGE=python:3.12-slim \
EVALSCOPE_BASE_IMAGE=python:3.12-slim \
OPENCOMPASS_BASE_IMAGE=python:3.12-slim \
docker compose up --build
```

### Published ports

| Port | Service |
| --- | --- |
| `4173` | Web UI (Noctua branding) |
| `8080` | Go backend API (`provider-diff-backend` in container) |
| `9000` | EvalScope dashboard — http://localhost:9000/dashboard |
| `9100` | OpenCompass Web — http://localhost:9100/ |

OpenCompass is also available from the OpenCompass tab in the UI.

## Docker image (API + UI only)

```sh
docker build -t provider-diff .
docker run --rm -p 4173:4173 -p 8080:8080 provider-diff
```

Open http://localhost:4173/web/. The UI expects the backend at http://localhost:8080 — publish both ports.

## CI/CD

The workflow in `.github/workflows/deploy.yml` validates and deploys `main` with Docker Compose on the self-hosted runner labeled `provider-diff`.

Register the runner on `dev-02`:

```sh
ssh chentianyu@10.60.30.2
cd /data/services/actions-runner/provider-diff
RUNNER_TOKEN=<github-registration-token> ./setup-github-runner.sh
nohup ./run.sh > runner.log 2>&1 &
```

Create the registration token from GitHub: **Settings → Actions → Runners → New self-hosted runner**.

## Troubleshooting

### `build/icon.icns` missing or DMG build fails on icon

On macOS, regenerate the icon set (also run automatically by `npm run dist:dmg`):

```sh
bash scripts/build-mac-icon.sh
```

Ensure `assets/noctua/icon.png` exists in the repo (1024×1024 source for the app icon).

### Header logo does not appear

Confirm `assets/noctua/icon.png` is present and that you open the UI via `http://127.0.0.1:4173/web/` (not a `file://` path without assets).

### Browser history or Feishu settings seem empty after upgrade

The UI migrates data from legacy `llm-rosetta-*` and `providerx-*` localStorage keys to `noctua-*` on first read. Reload once; no manual export is required.

### `npm run desktop:dev` or `dist:dmg` fails on Linux / Windows

Desktop packaging is **macOS-only** by design (`scripts/build-dmg.js`). Use `npm run dev` or Docker on other platforms.

## Runtime check (maintainers)

After branding or packaging changes, on macOS:

```sh
cd backend && go test ./...
bash scripts/build-mac-icon.sh
npm run dev
# optional: npm run desktop:dev
# optional: npm run dist:dmg
```

Web/Docker flows do not depend on `build/icon.icns` or Electron.

## 协作开发

请勿在本地长期直接修改并 push `main`。请使用功能分支 + Pull Request，流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。仓库管理员可为 `main` 配置分支保护，见 [docs/project/branch-protection.md](docs/project/branch-protection.md)。
