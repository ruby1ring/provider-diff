# Noctua

**Noctua** is an LLM provider protocol compatibility testing tool. It runs structured cases against OpenAI-compatible (and provider-specific) Chat Completions APIs to show which parameters are supported, rejected, or silently ignored, and how response shapes differ from the baseline.

This repository’s internal name remains **provider-diff** for Docker images, Compose services, CI, and the embedded backend binary. Only the product-facing name (Web UI, macOS app, reports) is **Noctua**.

## Naming

| Context | Name |
| --- | --- |
| Product, Web UI, macOS `.app`, exported reports | **Noctua** |
| Git repository, npm package, Docker image / Compose service | `provider-diff` |
| Embedded backend process binary | `provider-diff-backend` |
| macOS Bundle ID (desktop app) | `cn.siliconflow.noctua` |

Renaming to Noctua does **not** change Docker or CI identifiers. Existing `docker compose`, image tags, and runner labels keep using `provider-diff`.

## Quick start

Start the static frontend and Go backend locally:

```sh
npm run dev
```

Open http://127.0.0.1:4173 (or the URL printed by the dev script). The UI shows the **Noctua** brand. Choose a provider, enter an API key in the browser, and run compatibility cases.

Requirements: Node.js (for `npm`), Python 3 (`http.server`), and Go (for `go run` in `backend/`).

## Local configuration

API keys stay on your machine and are not committed. To use a local config file for non-UI tooling:

```sh
cp config.example.yaml config.yaml
```

Replace the placeholder API keys in `config.yaml`.

## macOS desktop (Noctua)

Build a self-contained macOS app with the UI and embedded Go backend. **These commands run only on macOS** (they build a Darwin binary and generate `.icns` via `iconutil`).

**Requirements:** macOS, Node.js, Go, Xcode Command Line Tools (`iconutil`).

### Production DMG

```sh
npm install
npm run dist:dmg
```

Output: `dist/Noctua-<version>-<arch>.dmg` (for example `dist/Noctua-0.1.0-arm64.dmg`).

The app starts its own backend on a free `127.0.0.1` port and passes that URL into the UI. Docker Compose is not required.

Unsigned local builds may be blocked on first launch; use **right-click → Open** if Gatekeeper warns.

**Bundle ID:** `cn.siliconflow.noctua`. This is a separate app from any older **Provider Diff** install (`cn.siliconflow.provider-diff`); both can coexist.

### Local smoke test (no DMG)

Compiles the backend, refreshes `build/icon.icns`, and launches Electron:

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

The UI migrates data from legacy `llm-rosetta-*` localStorage keys to `noctua-*` on first read. Reload once; no manual export is required.

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
