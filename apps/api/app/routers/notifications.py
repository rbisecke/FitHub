"""Notifications and training-partners endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query

import app.repositories.team_sessions as repo
from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.team_session import Notification, TrainingPartner

router = APIRouter(tags=["notifications"])

Auth = Annotated[UserContext, Depends(get_current_user)]
DB = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]


@router.get("/api/v1/notifications", response_model=list[Notification])
async def list_notifications(
    user: Auth,
    conn: DB,
    include_read: bool = Query(default=False),
) -> list[Notification]:
    return await repo.list_notifications(conn, user_id=user.user_id, include_read=include_read)


@router.post("/api/v1/notifications/{notification_id}/read", response_model=Notification)
async def mark_read(user: Auth, conn: DB, notification_id: uuid.UUID) -> Notification:
    notif = await repo.mark_notification_read(
        conn, user_id=user.user_id, notification_id=notification_id
    )
    if notif is None:
        raise HTTPException(status_code=404)
    return notif


@router.get("/api/v1/training-partners", response_model=list[TrainingPartner])
async def list_training_partners(user: Auth, conn: DB) -> list[TrainingPartner]:
    return await repo.list_training_partners(conn, user_id=user.user_id)
