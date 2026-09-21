<<<<<<< HEAD
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
=======
# Agentic Development

The project demonstrates the use of AI agents in software development. In this project, I built a full-stack web application using DeepSeek-V4 Flash and GLM-5.3.

## Why this project

AI is becoming more efficient at writing code, and as a developer I find it discouraging to write code manually. To enhance my productivity, I focused on the processes of using AI to build useful tools that I want. The key question was: how do I prompt agents to build, test, and validate effectively?

Here are the processes I learned.

## 1. Starting with an idea

I had a vague idea. I opened Gemini chat and dictated the idea in detail. I used it to brainstorm the problem through brief discussions to narrow down exactly what I wanted. The end result was a [specification document](/_docs/sports_league_scoreboard_spec.md) for the project.

## 2. Mocking the frontend

I passed the specifications to Lovable with instructions to build a mocked frontend without a backend. Having a mocked frontend gives a clearer picture of what I want and allows me to correct it early.

![Image of the frontend](/_docs/frontend.png)

The frontend has to communicate with the backend, which means it needs certain information. I picture the frontend being the contractor and needing a service from the worker (backend). So I created a contract in the form of an [OpenAPI specification](/openapi.yaml), and from this the backend would be developed.

## 3. Setting up the agent workflow

Next, I set up the [agent engineer roles](/_docs/team/), defined the [development processes](/_docs/process.md), and organized the workspace inside an AWS EC2 server.

### Server
![Image of a server](/_docs/server.png)

### Agent
![Image of a coding agent](/_docs/agent.png)

### Workspace
![Image of the workspace](/_docs/workspace.png)

I instructed the agent to build a mocked backend and use an ORM, SQLAlchemy, to make the database dynamic. Mocking the backend makes it easier to test the integration with the frontend.

Having the frontend and backend communicate through a centralized endpoint creates a two-tier architecture. This is similar to a network: the mobile phone sends requests to the internet through the router and receives responses back through it.

## 4. Centralized client and server

![Two-tier architecture](/_docs/api-gateway.png)

*Image from ByteByte.com, API Gateways 101*

## 5. Integration and testing

Next, I instructed the agent to merge the frontend with the backend and run an integration test. Once done, the agent replaced the in-memory store with the inline database `sqlite3`. I performed a manual test of the full application, and it worked satisfactory.

## Takeaway

It is not necessary to write the code, but it is very important to understand how software is built, what processes to follow, how logic is structured, how to test and debug before transferring that workflow to an agent. This made me a power developer.

## What were the challenges?

- Agent overthinking: The project was small and doable in one session. I had specified 14 GitHub issues, but 26 were created, including out-of-scope tasks that I did not want for a prototype. I discarded the extra issues and reduced the model reasoning to low, which worked better.

- Approving commands every time: I did not want to babysit the agent, which is why I moved the work to a cloud server so it could run all the commands it needed. After setting up the project, I wanted to take coffee and return for the complete work. This is something I will research further.

---
Lessons were learnt from\
[DataTalksClub AI dev tools zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp)
>>>>>>> 779eee36038218d8aeb34f7810a3aed40fa06c43
