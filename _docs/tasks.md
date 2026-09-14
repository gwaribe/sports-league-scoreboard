# Backend Backlog: Sports League Scoreboard

The frontend (`frontend/`) already works against `MockLeagueService`. This backlog
builds the real backend it expects, as specified by `openapi.yaml` (the contract)
and `_docs/sports_league_scoreboard_spec.md` (the requirements). Implement each
task so its responses match `openapi.yaml` exactly; that document is the source of
truth for field names, status codes, and error messages.

Shared conventions (apply to every backend task below):

- Backend lives in a new `backend/` directory and is a Django project using
  Django REST Framework and SQLite.
- Manage dependencies and run commands with uv, per the repo `AGENTS.md`:
  `uv sync`, `uv add <package>`, `uv run python manage.py <command>`.
- All endpoints are served under the `/api` prefix (matching the `servers` entry
  in `openapi.yaml`) and require no authentication.
- Ids are strings in the `team-1` / `match-1` style shown in `openapi.yaml`.
- Every task is finished only when `uv run python manage.py test` passes, and the
  change is committed to git.

## 1. Scaffold the Django backend with a passing test
Goal: Stand up an empty, runnable Django backend managed by uv with one passing test.
Description: Create the `backend/` Django project, add Django REST Framework and a SQLite database, and wire the `/api` URL prefix described in `openapi.yaml`. Add a minimal test (for example, a health or API-root check) and confirm `uv run python manage.py test` passes. Do not add domain models or endpoints yet.

## 2. Add the Team model and migration
Goal: Persist teams with exactly the fields and constraints of the `Team` schema.
Description: Add a Team model with a string primary key (serialized as `team-1`), a required case-insensitively unique `name` (max 100, trimmed, non-empty), an optional `logo_url` (max 255, blank stored as null), and an auto-assigned `created_at`, matching the `Team` schema in `openapi.yaml`. Create the migration and tests covering field defaults, name trimming, and case-insensitive uniqueness. This assumes the Django scaffold already exists (task 1).

## 3. Implement the Teams endpoints
Goal: Serve `GET /teams` and `POST /teams` exactly as `openapi.yaml` specifies.
Description: Implement an endpoint that lists all teams and one that registers a new team, returning 201 with the created `Team` and rejecting blank or duplicate names with 400 and a `{"detail": ...}` body. Register them under `/api` so they satisfy the `listTeams` and `createTeam` operations, and add tests for the happy path plus each validation error.

## 4. Add the Match model and migration
Goal: Persist matches with lifecycles, scores, and team foreign keys.
Description: Add a Match model with a string primary key, `home_team`/`away_team` foreign keys to Team, `home_score`/`away_score` defaulting to 0, a `status` limited to `scheduled`/`live`/`completed`, an optional `scheduled_at`, and `created_at`/`updated_at` timestamps, matching the `Match` schema in `openapi.yaml`. Create the migration and tests asserting defaults, the status choices, non-negative scores, and foreign-key integrity. This assumes the Team model exists (task 2).

## 5. Schedule a match
Goal: Create scheduled fixtures via `POST /matches` per `openapi.yaml`.
Description: Implement match creation that accepts `home_team_id`, `away_team_id`, and an optional `scheduled_at`, initializing the match to `scheduled` with 0–0 scores and returning 201. Reject unknown team ids and a self-match with 400 and the exact `detail` messages shown in `openapi.yaml`, with tests for each case. This assumes the Match model exists (task 4).

## 6. List matches
Goal: Return every match across all statuses for the scoreboard.
Description: Implement `GET /matches` returning all matches as a JSON array using the `Match` schema's field names, including scores, `status`, `scheduled_at`, and timestamps, so the frontend's 6-second polling works. Add tests covering the empty state and matches in each of the three statuses. This assumes the Match model exists (task 4).

## 7. Start a match
Goal: Transition a scheduled match to live via `POST /matches/{matchId}/start`.
Description: Implement an endpoint that flips only `scheduled` → `live`, refreshes `updated_at`, and returns the updated match, per `openapi.yaml`. Return 404 for an unknown id and 400 with `{"detail": "Only a scheduled match can be started."}` for any other status, with tests covering the happy path, both errors, and a repeated start attempt. This assumes the Match model exists (task 4).

## 8. Complete a match
Goal: Transition a live match to completed and reject draws.
Description: Implement `POST /matches/{matchId}/complete` which flips only `live` → `completed`, refreshes `updated_at`, and returns the updated match, per `openapi.yaml`. Return 404 for an unknown id, 400 with `{"detail": "Only a live match can be completed."}` for a non-live match, and 400 with `{"detail": "Matches cannot end in a draw. Adjust the score first."}` when the scores are tied, with tests for each branch. This assumes the Match model exists (task 4).

## 9. Update the score
Goal: Overwrite both scores on a live or completed match via `PATCH /matches/{matchId}/score`.
Description: Implement an absolute (not incremental) score update accepting non-negative integer `home_score` and `away_score`, refreshing `updated_at` and returning the match, per `openapi.yaml`. Reject an unknown id with 404, a `scheduled` match with 400 "Start the match before entering scores.", and negative or non-integer values with 400 "Scores must be whole numbers of zero or more.", with tests for each case. This assumes the Match model exists (task 4).

## 10. Compute standings
Goal: Serve the sorted league table from completed matches via `GET /standings`.
Description: Implement an endpoint returning one `StandingRow` per registered team—zero-filled when they have no completed matches—aggregating `played`, `won`, `lost`, `points_for`, `points_against`, `point_diff`, and `points` from completed matches only, as defined in `openapi.yaml`. Sort by `points`, then `point_diff`, then `points_for`, then `team_name`, and test against a fixed fixture set that includes a team with no completed matches. This assumes Team and Match models and the complete-match endpoint exist (tasks 2, 4, 8).

## 11. Enforce the standard error shape everywhere
Goal: Ensure every non-2xx response is a JSON `{"detail": "<message>"}` object.
Description: Add a shared error handler (a DRF exception handler plus Django's 404/500 handling) so validation failures, missing resources, and unexpected exceptions all return the single `detail` string the frontend surfaces through `LeagueError`. Add tests asserting the shape for a 404, a 400 validation failure, and a forced unexpected exception, without changing the status codes already used. This builds on the existing endpoints (tasks 3–10).

## 12. Add the HTTP LeagueService implementation
Goal: Replace the mock with a real client that calls the backend.
Description: Add an HTTP implementation of the `LeagueService` interface in `frontend/src/services/` that calls the `/api` endpoints, converts non-2xx responses into `LeagueError` using the `detail` field, and is returned by `getLeagueService()` (keep the mock available for tests). Take the base URL from an environment variable, enable CORS for the local frontend origin, add unit tests with a stubbed `fetch` for success and error mapping, and document the variable. This assumes the backend endpoints exist (tasks 3–10).

## 13. Add a seed data command
Goal: Provide a repeatable command that fills the database with demo data.
Description: Add a Django management command (for example `uv run python manage.py seed_demo`) that idempotently creates a handful of teams plus scheduled, live, and completed matches, so a fresh database shows a realistic scoreboard and standings after `migrate`. Test that running the command twice does not create duplicate records. This assumes the models exist (tasks 2 and 4).

## 14. Verify the stack end to end
Goal: Confirm the running backend satisfies `openapi.yaml` and the frontend uses it.
Description: Run the backend and the frontend dev server together and walk the full flow—register teams, schedule a match, start it, enter scores, complete it, and read standings—checking each response against `openapi.yaml` and confirming the live board and table poll correctly. Fix any contract mismatches found and document the exact startup commands in `README.md`.
