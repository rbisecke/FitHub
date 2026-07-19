"""Integration tests for saved routines (BG-24)."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


async def _create_movement(client: AsyncClient, *, name: str, slug: str) -> str:
    r = await client.post(
        "/api/v1/movements",
        json={
            "name": name,
            "slug": slug,
            "base_movement": name,
            "modality": "strength",
            "movement_pattern": "squat",
        },
    )
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


@pytest.mark.asyncio
async def test_routines_requires_auth(anon_client: AsyncClient) -> None:
    assert (await anon_client.get("/api/v1/routines")).status_code == 401
    assert (await anon_client.post("/api/v1/routines", json={"name": "x"})).status_code == 401


@pytest.mark.asyncio
async def test_create_and_get_routine_with_movements(alice_client: AsyncClient) -> None:
    suffix = uuid.uuid4().hex[:8]
    m1 = await _create_movement(
        alice_client, name=f"Routine Squat {suffix}", slug=f"routine-squat-{suffix}"
    )
    m2 = await _create_movement(
        alice_client, name=f"Routine Bench {suffix}", slug=f"routine-bench-{suffix}"
    )

    r = await alice_client.post(
        "/api/v1/routines",
        json={
            "name": "Push Day A",
            "movements": [
                {"movement_id": m1, "implement": "barbell", "side": None},
                {"movement_id": m2, "implement": "barbell", "side": None},
            ],
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Push Day A"
    assert [mv["position"] for mv in body["movements"]] == [0, 1]
    assert [mv["movement_id"] for mv in body["movements"]] == [m1, m2]
    assert body["movements"][0]["movement_name"] == f"Routine Squat {suffix}"

    got = await alice_client.get(f"/api/v1/routines/{body['id']}")
    assert got.status_code == 200
    assert got.json()["movements"][1]["movement_id"] == m2


@pytest.mark.asyncio
async def test_empty_routine_is_valid(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/routines", json={"name": "Empty", "movements": []})
    assert r.status_code == 201
    assert r.json()["movements"] == []


@pytest.mark.asyncio
async def test_rename_routine(alice_client: AsyncClient) -> None:
    created = await alice_client.post("/api/v1/routines", json={"name": "Old"})
    rid = created.json()["id"]
    r = await alice_client.patch(f"/api/v1/routines/{rid}", json={"name": "New Name"})
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_routine(alice_client: AsyncClient) -> None:
    created = await alice_client.post("/api/v1/routines", json={"name": "Temp"})
    rid = created.json()["id"]
    assert (await alice_client.delete(f"/api/v1/routines/{rid}")).status_code == 204
    assert (await alice_client.get(f"/api/v1/routines/{rid}")).status_code == 404


@pytest.mark.asyncio
async def test_reorder_routines(alice_client: AsyncClient) -> None:
    a = (await alice_client.post("/api/v1/routines", json={"name": "A"})).json()["id"]
    b = (await alice_client.post("/api/v1/routines", json={"name": "B"})).json()["id"]
    c = (await alice_client.post("/api/v1/routines", json={"name": "C"})).json()["id"]

    # Created in order A, B, C → display_order 0,1,2.
    listed = (await alice_client.get("/api/v1/routines")).json()
    assert [r["name"] for r in listed] == ["A", "B", "C"]

    r = await alice_client.put("/api/v1/routines/reorder", json={"routine_ids": [c, a, b]})
    assert r.status_code == 200
    assert [r["name"] for r in r.json()] == ["C", "A", "B"]


@pytest.mark.asyncio
async def test_other_user_cannot_read_routine(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    created = await alice_client.post("/api/v1/routines", json={"name": "Alice only"})
    rid = created.json()["id"]
    # IDOR: other user gets 404, not 403.
    assert (await bob_client.get(f"/api/v1/routines/{rid}")).status_code == 404
    assert (
        await bob_client.patch(f"/api/v1/routines/{rid}", json={"name": "hack"})
    ).status_code == 404
    assert (await bob_client.delete(f"/api/v1/routines/{rid}")).status_code == 404
    assert bob_client and (await bob_client.get("/api/v1/routines")).json() == []


@pytest.mark.asyncio
async def test_reorder_ignores_foreign_ids(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    a = (await alice_client.post("/api/v1/routines", json={"name": "A"})).json()["id"]
    bob_r = (await bob_client.post("/api/v1/routines", json={"name": "Bob"})).json()["id"]
    # A foreign id in the reorder list simply matches no owned row.
    r = await alice_client.put("/api/v1/routines/reorder", json={"routine_ids": [bob_r, a]})
    assert r.status_code == 200
    assert [row["id"] for row in r.json()] == [a]
    # Bob's routine untouched.
    assert (await bob_client.get(f"/api/v1/routines/{bob_r}")).status_code == 200


@pytest.mark.asyncio
async def test_name_is_required(alice_client: AsyncClient) -> None:
    assert (await alice_client.post("/api/v1/routines", json={"name": ""})).status_code == 422
    assert (await alice_client.post("/api/v1/routines", json={})).status_code == 422


@pytest.mark.asyncio
async def test_whitespace_only_name_is_422(alice_client: AsyncClient) -> None:
    # Must be a clean validation error, not a 500 on the DB CHECK constraint.
    r = await alice_client.post("/api/v1/routines", json={"name": "   "})
    assert r.status_code == 422
    created = await alice_client.post("/api/v1/routines", json={"name": "Real"})
    rid = created.json()["id"]
    assert (
        await alice_client.patch(f"/api/v1/routines/{rid}", json={"name": "  "})
    ).status_code == 422


@pytest.mark.asyncio
async def test_name_is_stripped(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/routines", json={"name": "  Push Day  "})
    assert r.status_code == 201
    assert r.json()["name"] == "Push Day"


@pytest.mark.asyncio
async def test_unknown_movement_id_is_400(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/routines",
        json={"name": "Bad", "movements": [{"movement_id": str(uuid.uuid4())}]},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_get_unknown_routine_404(alice_client: AsyncClient) -> None:
    assert (await alice_client.get(f"/api/v1/routines/{uuid.uuid4()}")).status_code == 404
