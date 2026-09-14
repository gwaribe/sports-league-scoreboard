# Sports League Scoreboard — Backend

FastAPI implementation of the contract in [`../openapi.yaml`](../openapi.yaml),
backed by an in-memory store that is seeded with a small demo league so the
frontend has data to render immediately.

## Running

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

All endpoints are served under `/api`, e.g. `http://localhost:8000/api/standings`.

## Tests

```bash
cd backend
uv run pytest
```

## Authentication

Read endpoints (`GET /teams`, `GET /matches`, `GET /standings`) are public.

Operator endpoints that change state require a bearer token:

| Endpoint | Auth |
| --- | --- |
| `POST /teams` | required |
| `POST /matches` | required |
| `PATCH /matches/{matchId}/score` | required |
| `POST /matches/{matchId}/start` | required |
| `POST /matches/{matchId}/complete` | required |

Obtain a token with `POST /api/auth/login` (or create a user with
`POST /api/auth/register`). Passwords are stored as salted PBKDF2-SHA256
hashes; tokens are HMAC-SHA256 signed and carry an expiry.

A demo operator is seeded and can log in immediately:

- username: `operator`
- password: `operator123`
