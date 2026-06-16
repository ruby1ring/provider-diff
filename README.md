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

Open http://127.0.0.1:4173 (or the URL printed by the dev script). Choose a provider, enter an API key in the browser, and run compatibility cases.

Requirements: Node.js (for `npm`), Python 3 (`http.server`), and Go (for `go run` in `backend/`).

## Local configuration

API keys stay on your machine and are not committed. To use a local config file for non-UI tooling:

```sh
cp config.example.yaml config.yaml
```

Replace the placeholder API keys in `config.yaml`.

## Capacity probes

To probe each provider's accepted maximum output limit and total context length, run:

```sh
node scripts/probe-capacity.js
```

The probe reads `config.yaml`, uses each provider manifest's default model, tries common K/M tiers from large to small, and writes a timestamped JSON report under `outputs/capacity-probes/`. Each tier is emitted as a capacity test case with a stable `case_id`. Reports include `capacity_display.最大Max Output`, `capacity_display.最大Total Context`, `supported_max_display`, `upper_bound_found`, `nearest_higher_non_supported.candidate_display`, and `top_candidate_supported` so a passing top tier is not mistaken for a proven maximum.

Useful options:

```sh
node scripts/probe-capacity.js --providers openai,deepseek
node scripts/probe-capacity.js --endpoint-id all --providers claude,openrouter
node scripts/probe-capacity.js --providers vllm --model vllm=Qwen/Qwen3-8B --context-candidates 512k,256k,128k
node scripts/probe-capacity.js --providers siliconflow --context-safety-margin-ratio 0.05
node scripts/probe-capacity.js --providers ali,deepseek,minimax --max-concurrency 3
node scripts/probe-capacity.js --dry-run
```

`max_output` is an acceptance probe for common output budget tiers (`max_tokens` or `max_completion_tokens`); it confirms the largest requested tier the endpoint accepts, not that the model actually generated that many tokens. `total_context` keeps the conclusion on common tiers such as `128k`, `256k`, and `1m`, but the actual long prompt is built with a proportional safety margin to avoid tokenizer and message-wrapper edge effects. The default margin ratio is `5%`, so each tier is tested at about `95%` of the displayed tier; attempt details include `tested_total_context_display` and provider `usage` when available. K/M labels use 1024 units: `128k = 131072`, `1m = 1048576`. The default mode stops only after a tier boundary is bracketed: one higher non-supported tier followed by a supported tier. Use `--exhaustive` to force every configured tier to run.

Capacity probes support target-level concurrency with `--max-concurrency`. Each provider/model target runs independently, while candidate tiers inside one target remain sequential so boundary detection stays correct.

See `docs/capacity-probe-methodology.md` for the testing methodology and result interpretation rules.

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

Open http://localhost:4173.

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

Open http://localhost:4173. The UI expects the backend at http://localhost:8080 — publish both ports.

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

Confirm `assets/noctua/icon.png` is present and that you open the UI via `http://127.0.0.1:4173/` (not a `file://` path without assets).

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

请勿在本地长期直接修改并 push `main`。请使用功能分支 + Pull Request，流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。仓库管理员可为 `main` 配置分支保护，见 [docs/branch-protection.md](docs/branch-protection.md)。
