"""Liveness and version probe (deployment validation).

The CI/CD pipeline polls this after a Render deploy to confirm the new commit
is actually serving traffic, and the same path (``/api/health``) is suitable as
the Render health check.
"""

from __future__ import annotations

import os

from fastapi import APIRouter

from .. import __version__
from ..models import Health

router = APIRouter(prefix="/health", tags=["Health"])


def _deployed_commit() -> str | None:
    """Return the commit the host is running, when it exposes one."""
    return (
        os.getenv("RENDER_GIT_COMMIT")
        or os.getenv("GIT_COMMIT")
        or os.getenv("SOURCE_VERSION")
        or None
    )


@router.get("", response_model=Health, summary="Health check")
def health() -> Health:
    """Report ``ok`` along with the application version and deployed commit."""
    return Health(status="ok", version=__version__, commit=_deployed_commit())
