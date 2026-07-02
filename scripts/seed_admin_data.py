"""
Seed realistic data into llm_usage, access_requests, and error_events
for local dev admin portal screenshots.

Run with:
    uv run --directory apps/api python /Users/rbisecke/FitHub/scripts/seed_admin_data.py
"""

import random
import uuid
from datetime import datetime, timedelta, timezone

import psycopg

DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# The five test users already in auth.users
USERS = [
    ("b5ad9d98-1520-4f9c-a344-3f9a2304f1a6", "e2e-qa@test.local"),
    ("2d9991fe-b6bf-494c-a6d3-83fe377c0ac0", "e2e-workout@test.local"),
    ("41efdb7b-5e44-4b20-b0b3-a27c13623cbf", "e2e-adaptations@test.local"),
    ("acefecea-03c3-4824-b513-9c3694a660d2", "e2e-injuries@test.local"),
    ("ce0531f2-26a7-4fe2-abd8-911a5cfad1c7", "e2e-partner@test.local"),
]

MODELS = [
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",  # weighted heavier
    "claude-sonnet-4-6",
]

ENDPOINTS = [
    "chat_stream",
    "chat_stream",
    "chat_stream",
    "chat",
    "parse_log",
]

PATHS = [
    "/api/v1/coach/chat",
    "/api/v1/workouts",
    "/api/v1/analytics/load",
    "/api/v1/coach/parse-log",
    "/api/v1/plans",
]

ERROR_TYPES = [
    ("ValueError", "Invalid workout format in request body"),
    ("TimeoutError", "Upstream LLM call exceeded timeout threshold"),
    ("DatabaseError", "Connection pool exhausted under load"),
    ("ValidationError", "Missing required field: movement_id"),
    ("RuntimeError", "RAG retrieval returned no chunks for query"),
]

ACCESS_REQUESTS = [
    (
        "Alice Chen",
        "alice.chen@gmail.com",
        "I'm a CrossFit Level 2 coach looking to track my athletes' progress alongside my own training. Been coaching for 6 years at a local box.",
        "pending",
    ),
    (
        "Marcus Webb",
        "marcus.webb@outlook.com",
        "Competitive masters athlete (50+). I want to analyse my periodisation and identify when I'm accumulating too much fatigue before competitions.",
        "pending",
    ),
    (
        "Priya Nair",
        "priya.nair@proton.me",
        "Software engineer who trains 5x/week. Love the git metaphor — version-controlling my training makes complete sense to me.",
        "pending",
    ),
    (
        "Jordan Kim",
        "j.kim@hey.com",
        "Olympic lifting athlete. I need to track my snatch and clean & jerk progressions with PR tagging. Current spreadsheets are a mess.",
        "approved",
    ),
    (
        "Sam Torres",
        "sam.torres@fastmail.com",
        "I run a small PT practice and want to track a handful of clients alongside my own training. This looks like exactly what I've been looking for.",
        "approved",
    ),
    (
        "Casey Morgan",
        "casey.morgan@gmail.com",
        "Just curious about the app, want to try it out.",
        "rejected",
    ),
    (
        "Riley Park",
        "riley.park@icloud.com",
        "I do CrossFit 4 days a week and have been manually tracking in Notion for 2 years. I want something that actually understands fitness metrics.",
        "pending",
    ),
]


def random_ts(days_back_max: int, days_back_min: int = 0) -> datetime:
    offset = random.uniform(days_back_min * 86400, days_back_max * 86400)
    return datetime.now(timezone.utc) - timedelta(seconds=offset)


def seed_llm_usage(cur: psycopg.Cursor) -> None:
    print("Seeding llm_usage...")
    rows = []

    # Generate ~120 rows spread across 30 days and all users
    for _ in range(120):
        user_id, _ = random.choice(USERS)
        endpoint = random.choice(ENDPOINTS)
        model = random.choice(MODELS)

        input_tokens = random.randint(800, 4200)
        output_tokens = random.randint(120, 900)
        # ~40% cache hit rate
        cache_read = (
            random.randint(0, input_tokens // 2) if random.random() < 0.4 else 0
        )
        cache_write = random.randint(200, 800) if random.random() < 0.3 else 0

        rag_chunks = (
            random.randint(3, 8) if endpoint in ("chat_stream", "chat") else None
        )
        max_rrf = round(random.uniform(0.4, 0.92), 4) if rag_chunks else None
        ttft = random.randint(380, 2800) if endpoint == "chat_stream" else None
        duration = random.randint(800, 8000)

        # 4% error rate
        error_code = (
            random.choice(["overloaded_error", "api_error"])
            if random.random() < 0.04
            else None
        )
        error_msg = "Anthropic API overloaded" if error_code else None

        rows.append(
            (
                str(uuid.uuid4()),
                random_ts(30),
                user_id,
                None,  # session_id
                str(uuid.uuid4())[:8],  # request_id
                endpoint,
                model,
                input_tokens,
                output_tokens,
                cache_read,
                cache_write,
                rag_chunks,
                max_rrf,
                ttft,
                duration,
                error_code,
                error_msg,
                False,  # stub
            )
        )

    cur.executemany(
        """
        INSERT INTO llm_usage (
            id, created_at, user_id, session_id, request_id, endpoint, model,
            input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
            rag_chunks_used, max_rrf_score, ttft_ms, duration_ms,
            error_code, error_msg, stub
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """,
        rows,
    )
    print(f"  Inserted {len(rows)} llm_usage rows")


def seed_access_requests(cur: psycopg.Cursor) -> None:
    print("Seeding access_requests...")
    rows = []
    for name, email, motivation, status in ACCESS_REQUESTS:
        created = random_ts(25, 1)
        reviewed_at = None
        reviewed_by = None
        if status in ("approved", "rejected"):
            reviewed_at = created + timedelta(hours=random.randint(2, 48))
            reviewed_by = USERS[0][0]  # admin user

        rows.append(
            (
                str(uuid.uuid4()),
                created,
                email,
                name,
                motivation,
                status,
                reviewed_at,
                reviewed_by,
                None,  # review_note
                None,  # ip_hash
            )
        )

    cur.executemany(
        """
        INSERT INTO access_requests (
            id, created_at, email, name, motivation, status,
            reviewed_at, reviewed_by, review_note, ip_hash
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """,
        rows,
    )
    print(f"  Inserted {len(rows)} access_request rows")


def seed_error_events(cur: psycopg.Cursor) -> None:
    print("Seeding error_events...")
    rows = []

    for _ in range(28):
        user_id, _ = random.choice(USERS)
        error_type, error_msg = random.choice(ERROR_TYPES)
        status = random.choice([500, 500, 500, 422, 503, 502])
        path = random.choice(PATHS)

        rows.append(
            (
                str(uuid.uuid4()),
                random_ts(7),
                user_id,
                path,
                "POST"
                if "chat" in path or "workouts" in path or "plans" in path
                else "GET",
                status,
                error_type,
                error_msg,
                str(uuid.uuid4())[:8],
                random.randint(120, 6000),
            )
        )

    cur.executemany(
        """
        INSERT INTO error_events (
            id, created_at, user_id, path, method, status_code,
            error_type, error_msg, request_id, duration_ms
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """,
        rows,
    )
    print(f"  Inserted {len(rows)} error_event rows")


def main() -> None:
    with psycopg.connect(DSN, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM llm_usage WHERE stub = false")
            cur.execute("DELETE FROM access_requests")
            cur.execute("DELETE FROM error_events")
            print("Cleared existing seed data")

            seed_llm_usage(cur)
            seed_access_requests(cur)
            seed_error_events(cur)

        conn.commit()
    print("Done.")


if __name__ == "__main__":
    main()
