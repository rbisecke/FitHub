"""Shared FastAPI dependency type aliases used across all routers."""

from __future__ import annotations

from typing import Annotated, Any

import psycopg
from fastapi import Depends

from app.auth import UserContext, get_current_user
from app.db import get_db

Auth = Annotated[UserContext, Depends(get_current_user)]
DBConn = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]
