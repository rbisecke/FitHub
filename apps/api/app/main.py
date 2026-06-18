from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import UserContext, get_current_user

app = FastAPI(title="FitHub API", version="0.1.0")

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
