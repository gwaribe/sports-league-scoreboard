# Sports League Scoreboard

React frontend and FastAPI backend for managing teams, matches, scores, and standings.

## Run with Docker

From the repository root:

```sh
docker build -t sports-league-scoreboard .
docker run --rm -p 8000:8000 \
  --mount source=scoreboard-data,target=/data \
  sports-league-scoreboard
```

Open http://localhost:8000. The same Python server serves the frontend, the API
at `/api`, and API documentation at `/docs`. Direct navigation and refreshes on
frontend routes such as `/teams` and `/control` work too.

The Dockerfile builds a static SPA using Node 24, then copies its `dist/client`
files into a Python 3.12 image. Python dependencies are installed from `uv.lock`
with `uv sync --locked --no-dev`; the container runs uvicorn as a non-root user.
Node is only needed during the build. The frontend is built with
`VITE_API_BASE_URL=/api`, so it works on whichever host and port serve the container.

SQLite data is stored at `/data/league.db`; the named volume preserves it across
container replacements. An empty database is seeded on first startup. Override
`DATABASE_URL` with `docker run -e` to change the database location (other database
engines also require their SQLAlchemy driver to be installed).

## Local development

See [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md) for separate development servers and tests.

To build and serve the static frontend locally, use Node 24 and uv:

```sh
cd frontend
npm ci
VITE_API_BASE_URL=/api npm run build:static
cd ../backend
FRONTEND_DIR=../frontend/dist/client uv run uvicorn app.main:app --port 8000
```

`FRONTEND_DIR` defaults to `backend/static`. Without that directory, the backend
runs as an API-only development server. When setting `FRONTEND_DIR` explicitly,
the directory must exist.
