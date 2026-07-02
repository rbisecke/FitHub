from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.auth import UserContext, get_current_user
from app.config import get_settings


async def require_admin(
    user: Annotated[UserContext, Depends(get_current_user)],
) -> uuid.UUID:
    settings = get_settings()
    if str(user.user_id) not in settings.admin_user_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user.user_id
