# End-to-end tests

Playwright tests that exercise the whole application the way a person would:
they run against the full stack defined in [`../compose.yaml`](../compose.yaml)
(PostgreSQL + the FastAPI app serving the built frontend on port 8000).

## Run

From the repository root:

```sh
task e2e
```

The task installs dependencies, builds and starts the stack, waits for the API,
runs the suite, and always tears the stack down with `docker compose down -v`
(so each run starts from a freshly seeded database).

To run the suite yourself against an already-running stack:

```sh
docker compose up --build -d
cd e2e
npm ci
npx playwright install chromium
npm run e2e
```

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
uniquely named teams to stay repeatable. Point the suite at a different host
with `PLAYWRIGHT_BASE_URL` (default `http://localhost:8000`).

Artifacts (`playwright-report/`, `test-results/`) are written here and are
git-ignored.
