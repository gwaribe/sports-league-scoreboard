"""Serve the frontend bundle with a fallback for client-side routes."""

from pathlib import Path

from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope


class FrontendStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope: Scope) -> Response:
        # Unknown API endpoints must keep their JSON 404 response.
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404)

        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise

        # Missing assets must not receive HTML in place of JavaScript or CSS.
        if Path(path).suffix or path == "assets" or path.startswith("assets/"):
            raise HTTPException(status_code=404)

        return await super().get_response("index.html", scope)
