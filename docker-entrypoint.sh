#!/bin/sh
set -eu

APP_PORT="${APP_PORT:-4173}"
PORT="${PORT:-8080}"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${STATIC_PID:-}" ]; then
    kill "$STATIC_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

PORT="$PORT" provider-diff-backend &
BACKEND_PID="$!"

python -m http.server "$APP_PORT" --bind 0.0.0.0 &
STATIC_PID="$!"

echo "provider-diff frontend listening on http://0.0.0.0:${APP_PORT}"
echo "provider-diff backend listening on http://0.0.0.0:${PORT}"

while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    wait "$BACKEND_PID"
    exit $?
  fi
  if ! kill -0 "$STATIC_PID" 2>/dev/null; then
    wait "$STATIC_PID"
    exit $?
  fi
  sleep 1
done
