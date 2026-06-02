# provider-diff

Provider protocol compatibility comparison tool for OpenAI-compatible and provider-specific chat APIs.

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

The local build is unsigned unless you configure a macOS Developer ID certificate, so macOS may require right-clicking the app and choosing Open the first time. EvalScope and OpenCompass Docker services are not embedded in the DMG; their tabs still point at their local service URLs when those services are running separately.

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

- `4173`: provider-diff frontend
- `8080`: provider-diff Go backend API
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

Build only the provider-diff frontend/backend image:

```sh
docker build -t provider-diff .
```

Run only provider-diff without EvalScope:

```sh
docker run --rm -p 4173:4173 -p 8080:8080 provider-diff
```

Then open http://localhost:4173.

The frontend calls the backend at `http://localhost:8080`, so publish both ports when running locally.
