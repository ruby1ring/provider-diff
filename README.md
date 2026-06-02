# provider-diff

Provider protocol compatibility comparison tool for OpenAI-compatible and provider-specific chat APIs.

## Quick start

Start the frontend, Go backend, and EvalScope service locally:

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

Start the frontend, Go backend, and EvalScope dashboard together:

```sh
docker compose up --build
```

Then open http://localhost:4173.

If Docker Hub is slow or blocked in the target environment, use local cached base images or a reachable registry:

```sh
GO_BASE_IMAGE=golang:1.24.8-alpine \
PYTHON_BASE_IMAGE=python:3.12-slim \
EVALSCOPE_BASE_IMAGE=python:3.12-slim \
docker compose up --build
```

Published ports:

- `4173`: provider-diff frontend
- `8080`: provider-diff Go backend API
- `9000`: EvalScope dashboard at http://localhost:9000/dashboard

OpenCompass is currently embedded as the official CompassRank/CompassHub web entry in the UI, not as a local containerized service.

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
