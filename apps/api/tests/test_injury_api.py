"""Integration tests for the injuries API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_report_injury_no_red_flags(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={
            "body_region": "knee",
            "pain_level": 4,
            "mechanism": "overuse",
            "notes": "aches on squats",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is False
    assert data["body_region"] == "knee"
    assert data["pain_level"] == 4


@pytest.mark.asyncio
async def test_report_injury_red_flag_pain(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "shoulder", "pain_level": 9, "notes": None},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is True
    assert data["substitutions"] == []


@pytest.mark.asyncio
async def test_report_injury_red_flag_keyword(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 5, "notes": "heard a pop and it locked up"},
    )
    assert r.status_code == 200
    assert r.json()["requires_referral"] is True


@pytest.mark.asyncio
async def test_report_injury_has_substitutions(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 3, "notes": "mild ache"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is False
    assert isinstance(data["substitutions"], list)
    assert isinstance(data["contraindicated"], list)
    assert len(data["contraindicated"]) > 0


@pytest.mark.asyncio
async def test_list_injuries(alice_client: AsyncClient) -> None:
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "wrist", "pain_level": 3, "notes": None},
    )
    r = await alice_client.get("/api/v1/injuries")
    assert r.status_code == 200
    assert len(r.json()) >= 1


@pytest.mark.asyncio
async def test_injury_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 3},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_injury_invalid_region(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "toe", "pain_level": 3},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_injury_pain_level_out_of_range(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 11},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_report_hamstring_injury_red_flag_keyword(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "hamstring", "pain_level": 4, "notes": "tore it sprinting"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["body_region"] == "hamstring"
    assert data["requires_referral"] is True  # "tore" triggers for non-chronic region


@pytest.mark.asyncio
async def test_it_band_tore_keyword_no_referral(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={
            "body_region": "it_band",
            "pain_level": 5,
            "notes": "my IT band tore up during the run",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is False  # chronic region — keyword doesn't trigger


@pytest.mark.asyncio
async def test_report_forearm_injury_with_substitutions(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "forearm", "pain_level": 3, "notes": "wrist flexor tendinopathy"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is False
    assert len(data["substitutions"]) > 0


@pytest.mark.asyncio
async def test_injury_new_region_invalid_still_rejected(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "pinky_toe", "pain_level": 3},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /{id}/status tests
# ---------------------------------------------------------------------------


async def _create_injury(client: AsyncClient, body_region: str = "knee") -> str:
    r = await client.post(
        "/api/v1/injuries",
        json={"body_region": body_region, "pain_level": 3},
    )
    assert r.status_code == 200
    return r.json()["id"]


@pytest.mark.asyncio
async def test_update_injury_status_cleared(alice_client: AsyncClient) -> None:
    injury_id = await _create_injury(alice_client)
    r = await alice_client.patch(
        f"/api/v1/injuries/{injury_id}/status",
        json={"status": "cleared_with_restrictions", "restriction_notes": "No full squats"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "cleared_with_restrictions"
    assert data["restriction_notes"] == "No full squats"
    assert data["cleared_at"] is not None
    assert data["active"] is True  # still active — just cleared with restrictions


@pytest.mark.asyncio
async def test_update_injury_status_resolved(alice_client: AsyncClient) -> None:
    injury_id = await _create_injury(alice_client)
    r = await alice_client.patch(
        f"/api/v1/injuries/{injury_id}/status",
        json={"status": "resolved"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "resolved"
    assert data["active"] is False
    assert data["resolved_at"] is not None


@pytest.mark.asyncio
async def test_update_injury_resolved_not_in_list(alice_client: AsyncClient) -> None:
    injury_id = await _create_injury(alice_client, body_region="wrist")
    await alice_client.patch(
        f"/api/v1/injuries/{injury_id}/status",
        json={"status": "resolved"},
    )
    r = await alice_client.get("/api/v1/injuries")
    assert r.status_code == 200
    ids = [i["id"] for i in r.json()]
    assert injury_id not in ids


@pytest.mark.asyncio
async def test_update_injury_status_cannot_reactivate_resolved(alice_client: AsyncClient) -> None:
    injury_id = await _create_injury(alice_client)
    await alice_client.patch(
        f"/api/v1/injuries/{injury_id}/status",
        json={"status": "resolved"},
    )
    r = await alice_client.patch(
        f"/api/v1/injuries/{injury_id}/status",
        json={"status": "cleared_with_restrictions"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_update_injury_status_idor_prevention(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    alice_id = await _create_injury(alice_client)
    r = await bob_client.patch(
        f"/api/v1/injuries/{alice_id}/status",
        json={"status": "resolved"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_injury_status_requires_auth(anon_client: AsyncClient) -> None:
    fake_id = "00000000-0000-0000-0000-000000000001"
    r = await anon_client.patch(
        f"/api/v1/injuries/{fake_id}/status",
        json={"status": "resolved"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_update_injury_status_invalid_uuid(alice_client: AsyncClient) -> None:
    r = await alice_client.patch(
        "/api/v1/injuries/not-a-uuid/status",
        json={"status": "resolved"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_update_injury_status_invalid_transition(alice_client: AsyncClient) -> None:
    injury_id = await _create_injury(alice_client)
    r = await alice_client.patch(
        f"/api/v1/injuries/{injury_id}/status",
        json={"status": "active"},  # "active" is not an allowed value
    )
    assert r.status_code == 422
