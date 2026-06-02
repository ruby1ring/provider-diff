#!/usr/bin/env bash
set -euo pipefail

RUNNER_DIR="${RUNNER_DIR:-/data/services/actions-runner/provider-diff}"
REPO_URL="${REPO_URL:-https://github.com/siliconflow/provider-diff}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)-provider-diff}"
RUNNER_LABELS="${RUNNER_LABELS:-provider-diff,docker}"
RUNNER_VERSION="${RUNNER_VERSION:-2.333.1}"
RUNNER_TOKEN="${RUNNER_TOKEN:-${1:-}}"
CACHE_DIR="${CACHE_DIR:-/data/services/actions-runner/.cache}"
ARCHIVE_NAME="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
ARCHIVE_PATH="${CACHE_DIR}/${ARCHIVE_NAME}"

if [[ -z "${RUNNER_TOKEN}" ]]; then
  echo "Usage: RUNNER_TOKEN=<github-registration-token> $0" >&2
  echo "Create a registration token in GitHub: Settings -> Actions -> Runners -> New self-hosted runner." >&2
  exit 2
fi

mkdir -p "${RUNNER_DIR}" "${CACHE_DIR}"
cd "${RUNNER_DIR}"

if [[ ! -x ./config.sh ]]; then
  if [[ ! -f "${ARCHIVE_PATH}" ]]; then
    curl -fsSL \
      "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${ARCHIVE_NAME}" \
      -o "${ARCHIVE_PATH}"
  fi
  tar xzf "${ARCHIVE_PATH}"
fi

if [[ ! -f .runner ]]; then
  ./config.sh \
    --url "${REPO_URL}" \
    --token "${RUNNER_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "${RUNNER_LABELS}" \
    --work "_work" \
    --unattended \
    --replace
else
  echo "Runner is already configured in ${RUNNER_DIR}."
fi

echo "Runner configured."
echo "Start it with:"
echo "  cd ${RUNNER_DIR} && nohup ./run.sh > runner.log 2>&1 &"
