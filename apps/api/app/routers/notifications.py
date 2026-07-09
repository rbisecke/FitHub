"""Notifications and training-partners endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Request

import app.repositories.team_sessions as repo
from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.team_session import AddPartnerRequest, Notification, TrainingPartner
from app.repositories import profile as profile_repo

router = APIRouter(tags=["notifications"])


@router.get("/api/v1/notifications", response_model=list[Notification])
async def list_notifications(
    user: Auth,
    conn: DBConn,
    include_read: bool = Query(default=False),
) -> list[Notification]:
    return await repo.list_notifications(conn, user_id=user.user_id, include_read=include_read)


@router.post("/api/v1/notifications/{notification_id}/read", response_model=Notification)
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def mark_read(
    request: Request,
    user: Auth,
    conn: DBConn,
    notification_id: uuid.UUID,
) -> Notification:
    notif = await repo.mark_notification_read(
        conn, user_id=user.user_id, notification_id=notification_id
    )
    if notif is None:
        raise HTTPException(status_code=404)
    return notif


@router.get("/api/v1/training-partners", response_model=list[TrainingPartner])
async def list_training_partners(user: Auth, conn: DBConn) -> list[TrainingPartner]:
    return await repo.list_training_partners(conn, user_id=user.user_id)


@router.post("/api/v1/training-partners", response_model=TrainingPartner, status_code=201)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def add_training_partner(
    request: Request,
    user: Auth,
    conn: DBConn,
    body: AddPartnerRequest,
) -> TrainingPartner:
    email = body.email.strip().lower()
    partner = await profile_repo.find_user_by_email(conn, email=email, exclude_user_id=user.user_id)
    if partner is None:
        raise HTTPException(status_code=404, detail="Not found.")

    result = await repo.add_training_partner(
        conn,
        user_id=user.user_id,
        partner_id=partner["user_id"],
    )
    if result is None:
        raise HTTPException(status_code=409, detail="Already a training partner.")
    return result
