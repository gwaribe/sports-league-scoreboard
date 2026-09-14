"""FastAPI application entrypoint.

Wires the routers under the ``/api`` prefix (matching ``openapi.yaml``), seeds
the in-memory store on startup, enables CORS for the local frontend, and
normalises every error into the ``{"detail": "..."}`` shape the frontend expects.

Per ``openapi.yaml`` every endpoint is unauthenticated.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import seed
from .routers import matches, standings, teams
from .store import store

API_PREFIX = "/api"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed demo data so the frontend has something to show immediately."""
    if store.is_empty:
        seed.seed_store(store)
    yield


app = FastAPI(
    title="Sports League Scoreboard API",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the local dev frontend (any port on localhost/127.0.0.1) to call the API
# from the browser. Covered origins are not authenticated, so credentials stay off.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Map request validation failures to the 400 ``detail`` shape."""
    detail = "Invalid request."
    for error in exc.errors():
        message = str(error.get("msg", "")).removeprefix("Value error, ")
        if message:
            detail = message
            break
    return JSONResponse(status_code=400, content={"detail": detail})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Ensure HTTP errors always carry a string ``detail``."""
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    headers = getattr(exc, "headers", None)
    return JSONResponse(
        status_code=exc.status_code, content={"detail": detail}, headers=headers
    )


app.include_router(teams.router, prefix=API_PREFIX)
app.include_router(matches.router, prefix=API_PREFIX)
app.include_router(standings.router, prefix=API_PREFIX)
