#!/usr/bin/env bash
#
# Wait until a deployed instance answers its API, or fail after APP_READY_TIMEOUT
# seconds. Point it at the deployment with PLAYWRIGHT_BASE_URL, or pass a URL as
# the first argument. Useful because Render services can cold-start slowly.
#
set -euo pipefail

base="${1:-${PLAYWRIGHT_BASE_URL:-http://localhost:8000}}"
base="${base%/}"
url="${base}/api/health"
timeout="${APP_READY_TIMEOUT:-180}"
deadline=$((SECONDS + timeout))

echo "Waiting for ${url} (timeout ${timeout}s)…"
until curl -fsS -o /dev/null "$url"; do
  if (( SECONDS >= deadline )); then
    echo "Timed out after ${timeout}s waiting for ${url}" >&2
    exit 1
  fi
  sleep 2
done

echo "Deployment is ready at ${base}."
