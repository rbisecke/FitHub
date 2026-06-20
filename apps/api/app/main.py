from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.config import get_settings
from app.db import close_pool, init_pool
from app.routers.analytics import router as analytics_router
from app.routers.coach import router as coach_router
from app.routers.movements import router as movements_router
from app.routers.notifications import router as notifications_router
from app.routers.team_sessions import router as team_sessions_router
from app.routers.workouts import router as workouts_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    settings = get_settings()
    await init_pool(settings.postgres_dsn)
    yield
    await close_pool()


app = FastAPI(title="FitHub API", version="0.1.0", lifespan=lifespan)

app.include_router(analytics_router)
app.include_router(coach_router)
app.include_router(movements_router)
app.include_router(workouts_router)
app.include_router(team_sessions_router)
app.include_router(notifications_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str


class MeResponse(BaseModel):
    user_id: str


@app.get("/health")
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/me")
async def me(user: Annotated[UserContext, Depends(get_current_user)]) -> MeResponse:
    return MeResponse(user_id=str(user.user_id))
