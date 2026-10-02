# Environments: development and production

This document describes how the project runs **two independent environments**,
how code moves from a push to production, and the one-time setup each side
needs. It is the source of truth referenced by `render.yaml`.

For a click-by-click, do-this-in-order walkthrough, see
[`setup-environments.md`](setup-environments.md).

## Goal

- **development (dev)** — deployed automatically by CI after tests pass on every
  push to `main`. It is allowed to be unstable. Use it to manually exercise the
  change and catch issues early.
- **production (prod)** — only updated by a manual, approved trigger. It stays
  available on the last known-good release and is never touched by a routine
  push.

Both environments run the same Docker image (FastAPI serving the built SPA),
each with its own service and its own database, so data and deploys never mix.

## How a change flows

```
            push to main
                 |
             [ CI tests ]  backend pytest + frontend vitest + compose integration/e2e
                 |
        deploy development  (automatic, on success)
                 |
        /api/health reports the new commit  -> dev is live
                 |
        you manually test the dev URL
                 |
    Actions -> "CI/CD" -> Run workflow -> deploy = production
                 |
        GitHub Environment "production" requires your approval
                 |
        deploy production  -> /api/health reports the commit -> prod is live
```

Only one environment is deployed per run: a `push` deploys dev, a manual
`workflow_dispatch` with `deploy = production` deploys prod (after approval).

## What already exists in the repo

| Piece | Where | Notes |
| --- | --- | --- |
| CI/CD pipeline | `.github/workflows/ci-cd.yml` | Tests, then deploy + health validation |
| Deploy + validate script | `.github/scripts/deploy-render.sh` | Triggers a Render deploy hook, then polls `/api/health` until `commit == GITHUB_SHA` (15 min timeout) |
| Health probe | `backend/app/routers/health.py` | Returns `commit` from `RENDER_GIT_COMMIT` |
| Production blueprint | `render.yaml` | Defines the production web service + its own PostgreSQL |
| Dev service | Render dashboard | Existing service, e.g. `https://sports-league-scoreboard.onrender.com` |

The dev service is dashboard-managed. `render.yaml` is an Infrastructure-as-Code
blueprint for **production only**; applying it creates a second, separate web
service and database.

## Target architecture

Two Render web services, each with its own database:

- **development** — `sports-league-scoreboard` (existing). Deployed by CI on
  every push to `main`. Its own database.
- **production** — `sports-league-scoreboard-production` (from `render.yaml`).
  Deployed only by an approved manual run. Its own database,
  `scoreboard-production-db`.

Two GitHub **Environments** hold the per-environment configuration:

- `development` — no protection rules.
- `production` — **required reviewers = you** (this is the manual gate).

Each environment defines:

- Variable `BASE_URL` — the public URL to validate.
- Secret `RENDER_DEPLOY_HOOK_URL` — that service's deploy hook.

Because the values are scoped to the GitHub Environment, the two deploy jobs
share the exact same steps but target different services.

## One-time setup

### 1. Render

1. **development service** (existing, dashboard): open *Settings → Build &
   Deploy* and set **Auto-Deploy = No**. CI is now the only thing that deploys,
   so nothing ships before the tests pass.
2. **production service**: create it by hand (New → Web Service + New →
   Postgres) with **Auto-Deploy = No**, as described in
   [`setup-environments.md`](setup-environments.md). `render.yaml` documents the
   exact settings; applying it as a Blueprint is optional and may require a
   payment method on file.
3. Copy each service's **Deploy Hook URL** (*Settings → Deploy Hook*).

### 2. GitHub Environments

*Settings → Environments → New environment*:

- `development` — no protection rules.
  - Variable `BASE_URL` = dev URL.
  - Secret `RENDER_DEPLOY_HOOK_URL` = dev deploy hook.
- `production` — add **Required reviewers** and select yourself.
  - Variable `BASE_URL` = prod URL.
  - Secret `RENDER_DEPLOY_HOOK_URL` = prod deploy hook.

`deploy-development` falls back to the repository-level `E2E_BASE_URL` /
`RENDER_DEPLOY_HOOK_URL` if the environment values are missing, so an existing
setup keeps working while you migrate.

### 3. Confirm

Push a trivial change to `main`. The pipeline runs the tests, deploys dev, and
the deploy job turns green only once `/api/health` reports the pushed commit.
Then run *Actions → CI/CD → Run workflow* with `deploy = production`; it should
wait for your approval before touching production.

## Testing the change before promoting

Automated tests run in CI against a docker-compose stack (real Postgres, real
browser). After dev deploys, run the suite against the live dev URL for
end-to-end confidence:

```sh
task e2e PLAYWRIGHT_BASE_URL=https://sports-league-scoreboard.onrender.com
```

Then do your manual pass on the dev URL. Only when you are happy do you trigger
the production deploy.

## Always-available production

Two Render free-tier behaviours conflict with "production is always
accessible", so plan for them before going live:

- **Free web services spin down** after ~15 minutes of inactivity and cold-start
  on the next request. Set the production service to a paid instance type
  (`plan: starter`) to keep it always on. This is intentionally left unset in
  `render.yaml` so applying the blueprint never silently incurs charges; flip it
  when you are ready.
- **Free PostgreSQL expires** after 30 days. The production database should be a
  paid plan for a real deployment, otherwise it is deleted.

Dev can stay on the free tier; occasional cold starts there are acceptable.

## How deploy validation works

`deploy-render.sh` posts to the deploy hook, then polls
`<BASE_URL>/api/health` until the JSON `commit` equals `GITHUB_SHA` (the commit
being shipped), or fails after 15 minutes. Render injects `RENDER_GIT_COMMIT`,
which the health endpoint returns, so a green job proves the new build is
actually serving traffic — not just that Render accepted the hook.

## Important caveats

- **Deploy hooks deploy the service's branch HEAD.** Render's deploy hook ships
  the latest commit on the branch configured for that service (both services
  track `main`). This is why production is triggered from `main` via
  `workflow_dispatch`, and why the validation waits for `GITHUB_SHA`: when you
  deploy from `main`, `GITHUB_SHA` is `main`'s HEAD, so it matches. Do not
  dispatch a deploy from a feature branch — the hook would still deploy `main`
  and the health check would never see the branch commit.
- If you would rather promote on GitHub **Releases**, the deploy hook still
  ships `main` HEAD, so a release tag that is not `main`'s HEAD will fail
  validation. Promoting by commit SHA instead requires the Render API
  (`POST /v1/services/{id}/deploys` with `commitId`), not a deploy hook.
- Keep Render's native **Auto-Deploy off** on both services. If it stays on,
  Render redeploys on push independently of CI, defeating the test gate.
- Provision the two databases separately. Production data must never live in the
  dev database.
- Concurrency is keyed by workflow + ref + event, so a push to `main` cannot
  cancel an in-flight approved production deploy.

## Manual housekeeping

- To re-run only the deploy for dev: *Actions → CI/CD → Run workflow*,
  `deploy = development` (from `main`).
- To roll production back: open the Render service, pick the last good deploy,
  and choose *Rollback*. The database is not rolled back, so make schema changes
  backward compatible.
