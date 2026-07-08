from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.dependencies.common import Auth, DBConn
from app.models.profile import (
    PatchProfileRequest,
    PinnedMovement,
    ProfileStats,
    SetPinnedMovementsRequest,
    UserProfile,
    UserSearchResult,
)
from app.repositories import profile as repo

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    user: Auth,
    conn: DBConn,
    q: str = Query(min_length=2, max_length=100),
) -> list[UserSearchResult]:
    """Search FitHub users by display name or email (excludes the caller)."""
    rows = await repo.search_users(conn, query=q, exclude_user_id=user.user_id)
    return [UserSearchResult(**r) for r in rows]


@router.get("", response_model=UserProfile)
async def get_profile(user: Auth, conn: DBConn) -> UserProfile:
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
async def get_profile_stats(user: Auth, conn: DBConn) -> ProfileStats:
    return await repo.get_profile_stats(conn, user_id=user.user_id)


@router.patch("", response_model=UserProfile)
async def patch_profile(user: Auth, conn: DBConn, body: PatchProfileRequest) -> UserProfile:
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


@router.get("/pinned-movements", response_model=list[PinnedMovement])
async def get_pinned_movements(user: Auth, conn: DBConn) -> list[PinnedMovement]:
    return await repo.list_pinned_movements(conn, user_id=user.user_id)


@router.put("/pinned-movements", response_model=list[PinnedMovement])
async def put_pinned_movements(
    user: Auth, conn: DBConn, body: SetPinnedMovementsRequest
) -> list[PinnedMovement]:
    return await repo.set_pinned_movements(conn, user_id=user.user_id, body=body)
