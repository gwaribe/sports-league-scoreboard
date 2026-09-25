# End-to-end tests

Playwright tests that exercise the whole application the way a person would.
They run against an **already-deployed** instance (for example the Render web
service) and never build or start the app themselves.

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

## What is covered

- `tests/api.spec.ts` — the HTTP contract: SPA serving and client-route
  fallback, JSON errors, duplicate-team handling, and match lifecycle rules
  (no self-matches, no scoring before kick-off, no draws, no negative scores).
- `tests/teams.spec.ts` — registering teams through the UI and the duplicate
  and validation error states.
- `tests/match-lifecycle.spec.ts` — the main flow: schedule a fixture, start
  it, keep score, end the game, and confirm the result shows up on the public
  scoreboard and in the standings table.
- `tests/scoreboard.spec.ts` — scoreboard rendering, live polling of
  out-of-band score changes, and navigation between the main pages.

Tests mutate league data, so they run serially (`workers: 1`) and create
uniquely named teams to stay repeatable across runs against the same
deployment.

## CI

See [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) for a GitHub
Actions job that targets the deployed app. Set the `E2E_BASE_URL` repository
variable (Settings → Secrets and variables → Actions → Variables) to the Render
URL. The job:

- uses the runner's preinstalled Chrome — no browser download;
- builds nothing and starts no database (the Render service is already running);
- runs on `deployment_status` after Render reports success, so it never tests a
  stale version. `workflow_dispatch` is also enabled for manual runs.

If you prefer a Render deploy hook, have it POST a `repository_dispatch` of type
`render-deploy` and uncomment the matching trigger in the workflow. Point the
same `PLAYWRIGHT_BASE_URL` / `PLAYWRIGHT_CHANNEL` environment variables at any
other CI runner.

Note: the suite writes uniquely named teams and matches to whatever instance it
targets, so prefer a staging/PR environment over a shared production one.

Artifacts (`playwright-report/`, `test-results/`) are written here and are
git-ignored.
