import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.auth import UserContext, get_current_user
from app.config import get_settings
from app.db import close_pool, init_pool
from app.jobs.budget_check import check_llm_budget, cleanup_old_error_events
from app.logging_config import configure_logging
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import limiter
from app.routers.adaptations import router as adaptations_router  # noqa: F401
from app.routers.analytics import router as analytics_router
from app.routers.coach import router as coach_router
from app.routers.injuries import router as injuries_router  # noqa: F401
from app.routers.integrations import router as integrations_router  # noqa: F401
from app.routers.movements import router as movements_router
from app.routers.notifications import router as notifications_router
from app.routers.plans import router as plans_router  # noqa: F401
from app.routers.profile import router as profile_router
from app.routers.team_sessions import router as team_sessions_router
from app.routers.workouts import router as workouts_router

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    settings = get_settings()
    await init_pool(settings.postgres_dsn)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_llm_budget, "cron", hour=8)
    scheduler.add_job(cleanup_old_error_events, "cron", hour=3)
    scheduler.start()
    yield
    scheduler.shutdown()
    await close_pool()


app = FastAPI(title="FitHub API", version="0.2.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.include_router(analytics_router)
app.include_router(coach_router)
app.include_router(integrations_router)
app.include_router(movements_router)
app.include_router(profile_router)
app.include_router(workouts_router)
app.include_router(plans_router)
app.include_router(adaptations_router)
app.include_router(injuries_router)
app.include_router(team_sessions_router)
app.include_router(notifications_router)

# Middleware registration order: last add_middleware() runs first (outermost).
# CORS runs outermost; SlowAPI and RequestLogging run inside.
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:3000")],
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
