# End-to-end tests

Playwright tests that exercise the whole application the way a person would.
They run against whatever URL you point them at: the CI pipeline targets the
docker compose stack it just built, and you can target a deployed instance (for
example the Render web service).

## Run against a deployment

From the repository root:

```sh
task e2e PLAYWRIGHT_BASE_URL=https://your-app.onrender.com
```

`task e2e` installs the npm dependencies, waits for the deployment to answer its
API (Render can cold-start slowly), then runs the suite.

To run the suite by hand instead:

```sh
cd e2e
npm ci
PLAYWRIGHT_BASE_URL=https://your-app.onrender.com npm run e2e
```

## Browsers: no download by default

The tests drive the **Google Chrome already installed on the machine** by
default. CI runners such as GitHub Actions `ubuntu-latest` ship Chrome, so the
pipeline needs no `playwright install` step and downloads no browser.

To use Playwright's managed Chromium instead (useful locally), install it once
and select it:

```sh
cd e2e
npm run install:browsers        # one-time download
PLAYWRIGHT_CHANNEL=bundled npm run e2e
```

`PLAYWRIGHT_CHANNEL` also accepts `chromium`, `msedge`, etc.

Video recording is disabled in `playwright.config.ts` on purpose: rendering
video requires Playwright's separate `ffmpeg` download. Traces (`on-first-retry`)
and failure screenshots cover debugging without any extra binary.

## What is covered

- `tests/api.spec.ts` — the **integration** suite (run with
  `npm run test:integration`): the HTTP contract, health probe, SPA serving and
  client-route fallback, JSON errors, duplicate-team handling, and match
  lifecycle rules (no self-matches, no scoring before kick-off, no draws, no
  negative scores).
- `tests/teams.spec.ts` — registering teams through the UI and the duplicate
  and validation error states.
- `tests/match-lifecycle.spec.ts` — the main flow: schedule a fixture, start
  it, keep score, end the game, and confirm the result shows up on the public
  scoreboard and in the standings table.
- `tests/scoreboard.spec.ts` — scoreboard rendering, live polling of
  out-of-band score changes, and navigation between the main pages.

The browser specs are grouped under `npm run test:e2e`; `npm run e2e` runs
everything.

Tests mutate league data, so they run serially (`workers: 1`) and create
uniquely named teams to stay repeatable across runs against the same
deployment.

## CI

[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) uses this suite
in its `compose-tests` and `deploy` jobs:

- `compose-tests` builds the stack with
  `docker compose up --build -d --wait`, then runs `npm run test:integration`
  (API contract) and `npm run test:e2e` (browser) against `http://localhost:8000`.
  It uses the runner's preinstalled Chrome — no browser download.
- `deploy` triggers the Render deploy hook, then polls `/api/health` until it
  reports the commit that was pushed, which proves the new build is live.

Configure these in GitHub → Settings → Secrets and variables → Actions:

- Variable `E2E_BASE_URL` — the deployed URL to validate after a deploy. A
  secret with the same name is accepted as a fallback, but a variable is
  preferred since the URL is not sensitive.
- Secret `RENDER_DEPLOY_HOOK_URL` — the Render service's deploy hook URL.

Note: the suite writes uniquely named teams and matches to whatever instance it
targets, so prefer a staging/PR environment over a shared production one.

Artifacts (`playwright-report/`, `test-results/`) are written here and are
git-ignored.
