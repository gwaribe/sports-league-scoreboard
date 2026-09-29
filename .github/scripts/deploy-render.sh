#!/usr/bin/env bash
#
# Trigger a Render deploy and wait until /api/health reports the commit that
# this workflow run is shipping. Used by both the dev and production deploy jobs
# so the two environments validate identically.
#
# Required environment variables:
#   BASE_URL                Public URL of the environment to validate.
#   RENDER_DEPLOY_HOOK_URL  Deploy hook for that environment's Render service.
#   GITHUB_SHA              Commit to wait for (set by GitHub Actions).
set -euo pipefail

base_url="${BASE_URL:?BASE_URL is required}"
hook_url="${RENDER_DEPLOY_HOOK_URL:?RENDER_DEPLOY_HOOK_URL is required}"
target="${GITHUB_SHA:?GITHUB_SHA is required}"

echo "Triggering Render deploy for ${target}…"
curl -fsS -X POST "${hook_url}"
echo

base="${base_url%/}"
deadline=$((SECONDS + 900))
echo "Waiting for ${base}/api/health to report commit ${target}…"
while :; do
  body="$(curl -fsS "${base}/api/health" 2>/dev/null || true)"
  commit="$(printf '%s' "${body}" | jq -r '.commit // empty' 2>/dev/null || true)"
  echo "health: ${body:-<no response>}"
  if [ "${commit}" = "${target}" ]; then
    echo "Deployment validated: ${commit} is live."
    exit 0
  fi
  if (( SECONDS >= deadline )); then
    echo "Timed out after 15m waiting for commit ${target}." >&2
    exit 1
  fi
  sleep 15
done
