# Backend Backlog: Sports League Scoreboard

The frontend (`frontend/`) already works against `MockLeagueService`. This backlog
builds the real backend it expects, as specified by `openapi.yaml` (the contract)
and `_docs/sports_league_scoreboard_spec.md` (the requirements). Implement each
task so its responses match `openapi.yaml` exactly; that document is the source of
truth for field names, status codes, and error messages.

Shared conventions (apply to every backend task):

- Backend lives in a new `backend/` directory: a uv-managed Python project using
  FastAPI (served with uvicorn), Pydantic v2 models, the SQLAlchemy 2.0 ORM with
  Alembic migrations, and SQLite.
- Manage dependencies and run commands with uv, per the repo `AGENTS.md`:
  `uv sync`, `uv add <package>`, `uv run <command>`; run tests with
  `uv run pytest`.
- All endpoints are served under the `/api` prefix (matching the `servers` entry
  in `openapi.yaml`) and require no authentication.
- Ids are strings in the `team-1` / `match-1` style shown in `openapi.yaml`.
- Every task is finished only when `uv run pytest` passes, and the change is
  committed to git.

## GitHub issues

Each task from this backlog lives in a GitHub issue, which is now the working
copy, so track progress and discussion there.

- [#1](https://github.com/gwaribe/sports-league-scoreboard/issues/1) - Scaffold the FastAPI backend with a passing test
- [#2](https://github.com/gwaribe/sports-league-scoreboard/issues/2) - Add the Team model and Alembic migration
- [#3](https://github.com/gwaribe/sports-league-scoreboard/issues/3) - Implement the Teams endpoints
- [#4](https://github.com/gwaribe/sports-league-scoreboard/issues/4) - Add the Match model and Alembic migration
- [#5](https://github.com/gwaribe/sports-league-scoreboard/issues/5) - Schedule a match
- [#6](https://github.com/gwaribe/sports-league-scoreboard/issues/6) - List matches
- [#7](https://github.com/gwaribe/sports-league-scoreboard/issues/7) - Start a match
- [#8](https://github.com/gwaribe/sports-league-scoreboard/issues/8) - Complete a match
- [#9](https://github.com/gwaribe/sports-league-scoreboard/issues/9) - Update the score
- [#10](https://github.com/gwaribe/sports-league-scoreboard/issues/10) - Compute standings
- [#11](https://github.com/gwaribe/sports-league-scoreboard/issues/11) - Enforce the standard error shape everywhere
- [#12](https://github.com/gwaribe/sports-league-scoreboard/issues/12) - Add the HTTP LeagueService implementation
- [#13](https://github.com/gwaribe/sports-league-scoreboard/issues/13) - Add a seed data command
- [#14](https://github.com/gwaribe/sports-league-scoreboard/issues/14) - Verify the stack end to end

Dependencies between tasks are recorded in the `## Dependencies` section of
each issue, and referenced by number (for example, "#4" is the Match model).

## Deferred follow-ups

Items moved out of scope while grooming the tasks above live in their own issues:

- [#15](https://github.com/gwaribe/sports-league-scoreboard/issues/15) - Require authentication and authorization for operator endpoints
- [#16](https://github.com/gwaribe/sports-league-scoreboard/issues/16) - Resolve draws instead of rejecting them (overtime/penalties)
- [#17](https://github.com/gwaribe/sports-league-scoreboard/issues/17) - Push live updates over WebSockets/SSE instead of polling
- [#18](https://github.com/gwaribe/sports-league-scoreboard/issues/18) - Add player rosters and player-level statistics
- [#19](https://github.com/gwaribe/sports-league-scoreboard/issues/19) - Add tournament brackets, playoffs and multi-stage competitions
- [#20](https://github.com/gwaribe/sports-league-scoreboard/issues/20) - Add pagination, filtering and search to collection endpoints
- [#21](https://github.com/gwaribe/sports-league-scoreboard/issues/21) - Add update and delete operations for teams and matches
- [#22](https://github.com/gwaribe/sports-league-scoreboard/issues/22) - Add CI and a containerized deployment
- [#23](https://github.com/gwaribe/sports-league-scoreboard/issues/23) - Import and export league data
