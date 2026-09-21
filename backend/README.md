# Sports League Scoreboard — Backend

FastAPI implementation of the contract in [`../openapi.yaml`](../openapi.yaml),
backed by SQLAlchemy that is seeded with a small demo league so the
frontend has data to render immediately.

## Running

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

The server uses SQLite at `league.db` by default. Set `DATABASE_URL` to connect
to another SQLAlchemy-supported database; for example:

```bash
DATABASE_URL=sqlite:////absolute/path/to/league.db uv run uvicorn app.main:app
```

Tables are created directly by SQLAlchemy at startup. Alembic is intentionally
not used.

All endpoints are served under `/api`, e.g. `http://localhost:8000/api/standings`.

The backend also serves the frontend when a static build is available in
`backend/static`, or in the directory set by `FRONTEND_DIR`. See the
[root README](../README.md) for the combined Docker image and local static build.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/teams` | List teams |
| `POST` | `/api/teams` | Register a team |
| `GET` | `/api/matches` | List matches |
| `POST` | `/api/matches` | Schedule a match |
| `PATCH` | `/api/matches/{matchId}/score` | Overwrite a match score |
| `POST` | `/api/matches/{matchId}/start` | Start a scheduled match |
| `POST` | `/api/matches/{matchId}/complete` | Complete a live match |
| `GET` | `/api/standings` | Sorted league table |

Per `openapi.yaml` every endpoint is unauthenticated (the `bearerAuth` scheme is
declared there only as a post-MVP extension point and is not applied to any
operation).

## Tests

```bash
cd backend
uv run pytest
```
