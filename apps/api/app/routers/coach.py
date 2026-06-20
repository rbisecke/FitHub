"""Coach router: NL log parsing and RAG-backed chat."""

from __future__ import annotations

from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends

from app.ai.parse_log import parse_log_text
from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.coach import (
    ChatRequest,
    ChatResponse,
    ParseLogRequest,
    ParseLogResponse,
)

router = APIRouter(prefix="/api/v1/coach", tags=["coach"])

_Db = Annotated[psycopg.AsyncConnection[object], Depends(get_db)]


@router.post("/parse-log", response_model=ParseLogResponse)
async def parse_log(
    body: ParseLogRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> ParseLogResponse:
    result = await parse_log_text(body.text)

    await db.execute(
        """
        INSERT INTO coach_interactions (user_id, role, content, stub)
        VALUES (%s, 'user', %s, %s)
        """,
        [str(user.user_id), body.text, result.stub],
    )
    await db.execute(
        """
        INSERT INTO coach_interactions (user_id, role, content, stub)
        VALUES (%s, 'assistant', %s, %s)
        """,
        [str(user.user_id), result.parsed.model_dump_json(), result.stub],
    )

    return result


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> ChatResponse:
    from app.engine.safety import SafetyTier, classify_safety

    tier, _ = classify_safety(body.question)

    if tier == SafetyTier.STOP:
        await db.execute(
            "INSERT INTO coach_interactions (user_id, role, content, stub)"
            " VALUES (%s, 'user', %s, false)",
            [str(user.user_id), body.question],
        )
        return ChatResponse(
            answer=(
                "Please stop your workout and consult a medical professional immediately. "
                "This situation is beyond the scope of AI coaching."
            ),
            citations=[],
            stub=False,
            safety_tier="stop",
        )

    from app.ai.stub import is_stubbed

    if is_stubbed():
        return ChatResponse(
            answer=(
                "I'm your AI coach. In stub mode I can't retrieve real context, "
                "but ask me anything about programming, readiness, or movement."
            ),
            citations=[],
            stub=True,
            safety_tier=tier.value,
        )

    from app.ai.rag import hybrid_retrieve

    chunks = await hybrid_retrieve(body.question, db, top_k=5)

    from app.ai.client import get_client
    from app.models.coach import Citation

    context = "\n\n".join(str(c["body"]) for c in chunks)
    client = get_client()

    answer_text: str = client.chat.completions.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Context:\n{context}\n\nQuestion: {body.question}\n"
                    "Answer concisely using only the provided context."
                ),
            }
        ],
        response_model=str,
    )

    citations = [
        Citation(title=str(c["title"]), source_type=str(c["source_type"]), score=float(c["score"]))  # type: ignore[arg-type]
        for c in chunks
    ]
    return ChatResponse(answer=answer_text, citations=citations, stub=False, safety_tier=tier.value)
