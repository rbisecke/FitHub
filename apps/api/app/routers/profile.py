from __future__ import annotations

from typing import Annotated, Any

import psycopg
from fastapi import APIRouter, Depends, HTTPException

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.profile import PatchProfileRequest, ProfileStats, UserProfile
from app.repositories import profile as repo

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

Auth = Annotated[UserContext, Depends(get_current_user)]
DB = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]


@router.get("", response_model=UserProfile)
async def get_profile(user: Auth, conn: DB) -> UserProfile:
    profile = await repo.get_profile(
        conn,
        user_id=user.user_id,
        email="",  # email lives in Supabase session; frontend overlays it
        avatar_url=None,
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/stats", response_model=ProfileStats)
async def get_profile_stats(user: Auth, conn: DB) -> ProfileStats:
    return await repo.get_profile_stats(conn, user_id=user.user_id)


@router.patch("", response_model=UserProfile)
async def patch_profile(user: Auth, conn: DB, body: PatchProfileRequest) -> UserProfile:
    profile = await repo.patch_profile(
        conn,
        user_id=user.user_id,
        email="",
        avatar_url=None,
        patch=body,
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
