"""Integration tests for GET /api/v1/movements/{movement_id}/substitutes."""

from __future__ import annotations

import uuid

import psycopg
import pytest
from httpx import AsyncClient

TEST_DB_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


# ── helpers ───────────────────────────────────────────────────────────────────


async def _create_movement(
    client: AsyncClient,
    *,
    name: str,
    slug: str,
    movement_pattern: str = "squat",
) -> str:
    payload: dict = {
        "name": name,
        "slug": slug,
        "base_movement": name,
        "modality": "strength",
        "movement_pattern": movement_pattern,
    }
    r = await client.post("/api/v1/movements", json=payload)
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


async def _set_equipment(movement_id: str, equipment: list[str]) -> None:
    """Directly update equipment_required for a movement via the DB."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE public.movements SET equipment_required = %s WHERE id = %s",
            [equipment, uuid.UUID(movement_id)],
        )


# ── tests ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_substitutes_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get(f"/api/v1/movements/{uuid.uuid4()}/substitutes")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_substitutes_404_for_unknown_movement(alice_client: AsyncClient) -> None:
    r = await alice_client.get(f"/api/v1/movements/{uuid.uuid4()}/substitutes")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_substitutes_returns_same_pattern_movements(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Back Squat {uid}",
        slug=f"back-squat-{uid}",
        movement_pattern="squat",
    )
    alt_id = await _create_movement(
        alice_client,
        name=f"Front Squat {uid}",
        slug=f"front-squat-{uid}",
        movement_pattern="squat",
    )
    # A hinge movement — must not appear in substitutes
    await _create_movement(
        alice_client,
        name=f"Deadlift {uid}",
        slug=f"deadlift-{uid}",
        movement_pattern="hinge",
    )

    r = await alice_client.get(f"/api/v1/movements/{src_id}/substitutes")
    assert r.status_code == 200
    ids = {item["id"] for item in r.json()}
    assert alt_id in ids
    assert src_id not in ids  # source must be excluded


@pytest.mark.asyncio
async def test_substitutes_excludes_source_movement(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Overhead Squat {uid}",
        slug=f"overhead-squat-{uid}",
        movement_pattern="squat",
    )

    r = await alice_client.get(f"/api/v1/movements/{src_id}/substitutes")
    assert r.status_code == 200
    ids = {item["id"] for item in r.json()}
    assert src_id not in ids


@pytest.mark.asyncio
async def test_substitutes_equipment_filter_subset_match(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Barbell Squat {uid}",
        slug=f"barbell-squat-{uid}",
        movement_pattern="squat",
    )
    # Requires only a barbell — fits when caller has barbell
    barbell_only_id = await _create_movement(
        alice_client,
        name=f"Box Squat {uid}",
        slug=f"box-squat-{uid}",
        movement_pattern="squat",
    )
    await _set_equipment(barbell_only_id, ["barbell"])

    # Requires both barbell and rack — must NOT appear when caller only has barbell
    requires_rack_id = await _create_movement(
        alice_client,
        name=f"Rack Squat {uid}",
        slug=f"rack-squat-{uid}",
        movement_pattern="squat",
    )
    await _set_equipment(requires_rack_id, ["barbell", "rack"])

    r = await alice_client.get(
        f"/api/v1/movements/{src_id}/substitutes",
        params={"equipment": ["barbell"]},
    )
    assert r.status_code == 200
    ids = {item["id"] for item in r.json()}
    assert barbell_only_id in ids
    assert requires_rack_id not in ids


@pytest.mark.asyncio
async def test_substitutes_empty_list_when_no_equipment_match(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Goblet Squat {uid}",
        slug=f"goblet-squat-{uid}",
        movement_pattern="squat",
    )
    # Potential sub requires a barbell — won't fit caller who has only a kettlebell
    barbell_sub_id = await _create_movement(
        alice_client,
        name=f"Pause Squat {uid}",
        slug=f"pause-squat-{uid}",
        movement_pattern="squat",
    )
    await _set_equipment(barbell_sub_id, ["barbell"])

    r = await alice_client.get(
        f"/api/v1/movements/{src_id}/substitutes",
        params={"equipment": ["kettlebell"]},
    )
    assert r.status_code == 200
    # The barbell-only substitute must not appear; source is always excluded
    ids = {item["id"] for item in r.json()}
    assert barbell_sub_id not in ids
    assert src_id not in ids


@pytest.mark.asyncio
async def test_substitutes_no_equipment_filter_returns_all_pattern_matches(
    alice_client: AsyncClient,
) -> None:
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Air Squat {uid}",
        slug=f"air-squat-{uid}",
        movement_pattern="squat",
    )
    sub_a = await _create_movement(
        alice_client,
        name=f"Wall Ball {uid}",
        slug=f"wall-ball-{uid}",
        movement_pattern="squat",
    )
    await _set_equipment(sub_a, ["bodyweight"])

    sub_b = await _create_movement(
        alice_client,
        name=f"Thruster {uid}",
        slug=f"thruster-{uid}",
        movement_pattern="squat",
    )
    await _set_equipment(sub_b, ["barbell"])

    # No equipment param — all same-pattern movements should come back
    r = await alice_client.get(f"/api/v1/movements/{src_id}/substitutes")
    assert r.status_code == 200
    ids = {item["id"] for item in r.json()}
    assert sub_a in ids
    assert sub_b in ids
    assert src_id not in ids


@pytest.mark.asyncio
async def test_substitutes_rejects_oversized_equipment_list(alice_client: AsyncClient) -> None:
    """B8: more than 20 equipment tags is rejected with 422, matching the bound
    personal-records already enforces on its own list-length query param."""
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Zercher Squat {uid}",
        slug=f"zercher-squat-{uid}",
        movement_pattern="squat",
    )

    equipment = [f"tag-{i}" for i in range(21)]
    r = await alice_client.get(
        f"/api/v1/movements/{src_id}/substitutes",
        params={"equipment": equipment},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_substitutes_accepts_equipment_list_at_bound(alice_client: AsyncClient) -> None:
    """Exactly 20 equipment tags (the bound itself) must still be accepted."""
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Cyclist Squat {uid}",
        slug=f"cyclist-squat-{uid}",
        movement_pattern="squat",
    )

    equipment = [f"tag-{i}" for i in range(20)]
    r = await alice_client.get(
        f"/api/v1/movements/{src_id}/substitutes",
        params={"equipment": equipment},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_substitutes_empty_list_when_source_pattern_is_null(
    alice_client: AsyncClient,
) -> None:
    """B8: a source movement with no movement_pattern has no meaningful substitutes —
    must return an empty list via an explicit None guard, not a stringified 'None'
    that happens to match nothing."""
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Custom Novelty Movement {uid}",
        slug=f"custom-novelty-movement-{uid}",
        movement_pattern="squat",
    )
    # Clear movement_pattern to NULL directly — CreateMovementRequest allows it
    # to be omitted, but the movements router requires modality; simplest to
    # null it out post-creation for a deterministic fixture.
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE public.movements SET movement_pattern = NULL WHERE id = %s",
            [uuid.UUID(src_id)],
        )

    r = await alice_client.get(f"/api/v1/movements/{src_id}/substitutes")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_substitutes_response_shape(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    src_id = await _create_movement(
        alice_client,
        name=f"Split Squat {uid}",
        slug=f"split-squat-{uid}",
        movement_pattern="squat",
    )
    sub_id = await _create_movement(
        alice_client,
        name=f"Bulgarian Split Squat {uid}",
        slug=f"bulgarian-split-squat-{uid}",
        movement_pattern="squat",
    )
    await _set_equipment(sub_id, ["dumbbells"])

    r = await alice_client.get(f"/api/v1/movements/{src_id}/substitutes")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    item = items[0]
    assert "id" in item
    assert "name" in item
    assert "movement_pattern" in item
    assert "equipment_required" in item
    assert isinstance(item["equipment_required"], list)
