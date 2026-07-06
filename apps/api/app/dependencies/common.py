"""Shared FastAPI dependency type aliases used across all routers."""

from __future__ import annotations

from typing import Annotated, Any

import psycopg
from fastapi import Depends

from app.auth import UserContext, require_invited
from app.db import get_db

Auth = Annotated[UserContext, Depends(require_invited)]
DBConn = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]
