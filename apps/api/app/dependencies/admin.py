from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.auth import UserContext, get_current_user
from app.config import get_settings


def is_admin_user(user_id: uuid.UUID) -> bool:
    """Return whether a user ID is in the configured admin allowlist.

    Shared by `require_admin` (hard-gates admin routes) and the `/is-admin`
    route (answers the question for any authenticated user) so the two
    checks can never drift apart.
    """
    settings = get_settings()
    return str(user_id) in settings.admin_user_ids


async def require_admin(
    user: Annotated[UserContext, Depends(get_current_user)],
) -> uuid.UUID:
    if not is_admin_user(user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user.user_id
