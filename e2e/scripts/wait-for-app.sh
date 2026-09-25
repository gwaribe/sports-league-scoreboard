#!/usr/bin/env bash
#
# Block until the docker-compose app answers its API, or fail with logs.
#
set -euo pipefail

url="${1:-http://localhost:8000/api/teams}"
timeout="${APP_READY_TIMEOUT:-180}"
deadline=$((SECONDS + timeout))

until curl -fsS -o /dev/null "$url"; do
  if (( SECONDS >= deadline )); then
    echo "Timed out after ${timeout}s waiting for ${url}" >&2
    echo "--- docker compose logs ---" >&2
    docker compose logs >&2 || true
    exit 1
  fi
  sleep 2
done

echo "App is ready at ${url}."
