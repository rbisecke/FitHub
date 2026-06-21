"""Coach router: NL log parsing and RAG-backed chat."""

from __future__ import annotations

import os
from typing import Annotated, Any

import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends, Query, Request

from app.ai.chat_history import fetch_session_history, rag_query_text
from app.ai.parse_log import parse_log_text
from app.auth import UserContext, get_current_user
from app.db import get_db
from app.middleware.rate_limit import limiter
from app.models.coach import (
    ChatRequest,
    ChatResponse,
    HistoryMessage,
    ParseLogRequest,
    ParseLogResponse,
)

router = APIRouter(prefix="/api/v1/coach", tags=["coach"])

_Db = Annotated[psycopg.AsyncConnection[object], Depends(get_db)]

COACH_SYSTEM_PROMPT = (
    "You are a knowledgeable CrossFit and functional fitness coach. "
    "Answer the question using ONLY the provided context. "
    "Be concise and practical. "
    "Use markdown formatting where helpful: **bold** for key terms, "
    "bullet lists for multi-step advice, inline `code` for movement names. "
    'Respond with JSON: {"answer": "<your answer here>"}.'
)

_STUB_ANSWER = (
    "I'm your AI coach. In stub mode I can't retrieve real context, "
    "but ask me anything about programming, readiness, or movement."
)


@router.post("/parse-log", response_model=ParseLogResponse)
@limiter.limit("10/minute")
async def parse_log(
    request: Request,
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


@router.get("/history", response_model=list[HistoryMessage])
async def get_history(
    session_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[HistoryMessage]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """SELECT role, content, created_at FROM coach_interactions
               WHERE session_id = %s AND user_id = %s
               AND role IN ('user', 'assistant')
               ORDER BY created_at ASC LIMIT %s""",
            [session_id, str(user.user_id), limit],
        )
        rows = await cur.fetchall()
    return [HistoryMessage(**row) for row in rows]


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> ChatResponse:
    from app.engine.safety import SafetyTier, classify_safety

    tier, _ = classify_safety(body.question)
    session_id_str = str(body.session_id) if body.session_id else None

    if tier == SafetyTier.STOP:
        await db.execute(
            "INSERT INTO coach_interactions (user_id, role, content, stub, session_id)"
            " VALUES (%s, 'user', %s, false, %s)",
            [str(user.user_id), body.question, session_id_str],
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
        if session_id_str:
            await db.execute(
                "INSERT INTO coach_interactions (user_id, role, content, stub, session_id)"
                " VALUES (%s, 'user', %s, true, %s)",
                [str(user.user_id), body.question, session_id_str],
            )
            await db.execute(
                "INSERT INTO coach_interactions (user_id, role, content, stub, session_id)"
                " VALUES (%s, 'assistant', %s, true, %s)",
                [str(user.user_id), _STUB_ANSWER, session_id_str],
            )
        return ChatResponse(
            answer=_STUB_ANSWER,
            citations=[],
            stub=True,
            safety_tier=tier.value,
        )

    history = await fetch_session_history(session_id_str, db) if session_id_str else []

    from app.ai.rag import hybrid_retrieve

    rag_query = rag_query_text(body.question, history)
    chunks = await hybrid_retrieve(rag_query, db, top_k=5)

    from app.ai.client import get_client
    from app.ai.errors import call_llm
    from app.models.coach import Citation, _ChatAnswer

    context = "\n\n".join(str(c["body"]) for c in chunks)
    llm = get_client()

    user_content = f"Context:\n{context}\n\nQuestion: {body.question}"
    messages: list[Any] = list(history) + [{"role": "user", "content": user_content}]

    backend = os.getenv("LLM_BACKEND", "anthropic").lower()
    if backend == "anthropic":
        chat_result: _ChatAnswer = await call_llm(
            llm.client.chat.completions.create(
                model=llm.model,
                max_tokens=512,
                system=[
                    {
                        "type": "text",
                        "text": COACH_SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=messages,
                response_model=_ChatAnswer,
            ),
            context="coach_chat",
        )
    else:
        chat_result = await call_llm(
            llm.client.chat.completions.create(
                model=llm.model,
                max_tokens=512,
                messages=[{"role": "system", "content": COACH_SYSTEM_PROMPT}] + messages,  # type: ignore[arg-type]
                response_model=_ChatAnswer,
            ),
            context="coach_chat",
        )

    answer_text = chat_result.answer

    await db.execute(
        "INSERT INTO coach_interactions (user_id, role, content, stub, session_id)"
        " VALUES (%s, 'user', %s, false, %s)",
        [str(user.user_id), body.question, session_id_str],
    )
    await db.execute(
        "INSERT INTO coach_interactions (user_id, role, content, stub, session_id)"
        " VALUES (%s, 'assistant', %s, false, %s)",
        [str(user.user_id), answer_text, session_id_str],
    )

    citations = [
        Citation(title=str(c["title"]), source_type=str(c["source_type"]), score=float(c["score"]))  # type: ignore[arg-type]
        for c in chunks
    ]
    return ChatResponse(answer=answer_text, citations=citations, stub=False, safety_tier=tier.value)
