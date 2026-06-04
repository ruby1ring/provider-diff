# ProviderX

ProviderX is a provider protocol compatibility and gateway policy testing tool for OpenAI-compatible and provider-specific chat APIs.

## Quick start

Start the frontend and Go backend locally:

```sh
npm run dev
```

Open the local URL printed by the dev script, choose a provider, enter an API key locally, and run the compatibility cases.

## Local configuration

Runtime API keys should stay local and are intentionally ignored by Git. To create a local config file:

```sh
cp config.example.yaml config.yaml
```

Then replace the placeholder API keys in `config.yaml`.

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
node scripts/probe-capacity.js --providers ali,deepseek,minimax --max-concurrency 3
node scripts/probe-capacity.js --dry-run
```

`max_output` is an acceptance probe for common output budget tiers (`max_tokens` or `max_completion_tokens`); it confirms the largest requested tier the endpoint accepts, not that the model actually generated that many tokens. `total_context` sends generated filler text sized to `candidate - context_output_tokens` and records provider `usage` when available, so the report includes both the requested estimate and the provider-counted tokens. K/M labels use 1024 units: `128k = 131072`, `1m = 1048576`. The default mode stops only after a tier boundary is bracketed: one higher non-supported tier followed by a supported tier. Use `--exhaustive` to force every configured tier to run.

Capacity probes support target-level concurrency with `--max-concurrency`. Each provider/model target runs independently, while candidate tiers inside one target remain sequential so boundary detection stays correct.

See `docs/capacity-probe-methodology.md` for the testing methodology and result interpretation rules.

## Docker Compose

Start the frontend, Go backend, EvalScope dashboard, and OpenCompass Web together:

```sh
docker compose up --build
```

Then open http://localhost:4173.

## macOS DMG

Build a self-contained macOS desktop app with the static UI and embedded Go backend:

```sh
npm install
npm run dist:dmg
```

The DMG is written to `dist/`. The desktop app starts its own local backend on a free `127.0.0.1` port and passes that backend URL into the UI, so it does not require Docker Compose or a deployed frontend.

The local build is unsigned unless you configure a macOS Developer ID certificate, so macOS may require right-clicking the app and choosing Open the first time.

GitHub Actions also builds the DMG from the `Release DMG` workflow on every push to `main` or manual run. Each successful run replaces the fixed `latest` GitHub Release with one asset named `ProviderX-latest-macOS.dmg`, so the public download URL stays stable: `https://github.com/siliconflow/provider-diff/releases/download/latest/ProviderX-latest-macOS.dmg`.

EvalScope and OpenCompass Docker services are not bundled by default. The desktop shell is ready to start bundled service executables when they exist:

- `desktop/services/evalscope-service`
- `desktop/services/opencompass-service`

When those executables are present at packaging time, the app starts them on free local ports and injects their URLs into the EvalScope/OpenCompass tabs. Without those executables, the tabs keep using their external local-service URLs.

For local desktop smoke testing without producing a DMG:

```sh
npm run desktop:dev
```

If Docker Hub is slow or blocked in the target environment, use local cached base images or a reachable registry:

```sh
GO_BASE_IMAGE=golang:1.24.8-alpine \
PYTHON_BASE_IMAGE=python:3.12-slim \
EVALSCOPE_BASE_IMAGE=python:3.12-slim \
OPENCOMPASS_BASE_IMAGE=python:3.12-slim \
docker compose up --build
```

Published ports:

- `4173`: ProviderX frontend
- `8080`: ProviderX Go backend API
- `9000`: EvalScope dashboard at http://localhost:9000/dashboard
- `9100`: OpenCompass Web wrapper at http://localhost:9100/

OpenCompass is also available from the main UI's OpenCompass tab. The wrapper runs OpenCompass CLI jobs, shows recent outputs, and keeps links to the official CompassRank and CompassHub pages.

## CI/CD

The GitHub Actions workflow in `.github/workflows/deploy.yml` validates the project and deploys `main` with Docker Compose on the self-hosted runner labeled `provider-diff`.

Register the runner on `dev-02`:

```sh
ssh chentianyu@10.60.30.2
cd /data/services/actions-runner/provider-diff
RUNNER_TOKEN=<github-registration-token> ./setup-github-runner.sh
nohup ./run.sh > runner.log 2>&1 &
```

Create the registration token from GitHub repository settings: Settings -> Actions -> Runners -> New self-hosted runner.

## Docker Image

Build only the ProviderX frontend/backend image:

```sh
docker build -t provider-diff .
```

Run only ProviderX without EvalScope:

```sh
docker run --rm -p 4173:4173 -p 8080:8080 provider-diff
```

Then open http://localhost:4173.

The frontend calls the backend at `http://localhost:8080`, so publish both ports when running locally.
