# League Standings Live

Create a sports-league scoreboard application.

refer to the attached specification document.

Centralize every backend call in one services layer, and create a mock implementation of it so the whole app runs without a real backend.

Add tests.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/482e8d82-4963-40e0-add1-ddbe8b5f22b6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend API

The frontend talks to the FastAPI backend in `../backend` through
`frontend/src/services/http-league-service.ts`. The base URL is read from the
`VITE_API_BASE_URL` environment variable:

```sh
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8000/api
```

The default is `http://localhost:8000/api`, which matches the backend dev server
(`cd backend && uv run uvicorn app.main:app --reload --port 8000`). Set it to
`/api` for a same-origin deployment. `MockLeagueService` remains available for
tests and offline development via `setLeagueService(new MockLeagueService())`.
