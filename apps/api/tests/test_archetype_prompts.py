"""Tests for ARCHETYPE_PROMPTS registry and ARCHETYPE_MODEL routing."""

from __future__ import annotations

import pytest

from app.ai.archetype_prompts import ARCHETYPE_MODEL, ARCHETYPE_PROMPTS

EXPECTED_KEYS = {
    "general-crossfit",
    "strength-bias",
    "travel-minimal",
    "aerobic-base",
    "bodyweight-calisthenics",
    "skill-acquisition",
    "one-rm-peak",
}

HAIKU_ARCHETYPES = {
    "general-crossfit",
    "strength-bias",
    "travel-minimal",
    "aerobic-base",
    "bodyweight-calisthenics",
}

SONNET_ARCHETYPES = {
    "skill-acquisition",
    "one-rm-peak",
}


def test_archetype_prompts_has_all_keys() -> None:
    assert set(ARCHETYPE_PROMPTS.keys()) == EXPECTED_KEYS


def test_archetype_prompts_values_are_non_empty_strings() -> None:
    for key, prompt in ARCHETYPE_PROMPTS.items():
        assert isinstance(prompt, str), f"{key}: expected str, got {type(prompt)}"
        assert len(prompt) > 50, f"{key}: prompt too short ({len(prompt)} chars)"


def test_archetype_model_has_all_keys() -> None:
    assert set(ARCHETYPE_MODEL.keys()) == EXPECTED_KEYS


def test_archetype_model_values_are_strings() -> None:
    for key, model in ARCHETYPE_MODEL.items():
        assert isinstance(model, str), f"{key}: expected str, got {type(model)}"
        assert len(model) > 0, f"{key}: model ID is empty"


def test_haiku_archetypes_use_haiku_model() -> None:
    for key in HAIKU_ARCHETYPES:
        model = ARCHETYPE_MODEL[key]
        assert "haiku" in model.lower(), f"{key}: expected haiku model, got '{model}'"


def test_sonnet_archetypes_use_sonnet_model() -> None:
    for key in SONNET_ARCHETYPES:
        model = ARCHETYPE_MODEL[key]
        assert "sonnet" in model.lower(), f"{key}: expected sonnet model, got '{model}'"


def test_no_user_data_interpolation_in_prompts() -> None:
    """System prompts must be static strings with no format placeholders."""
    for key, prompt in ARCHETYPE_PROMPTS.items():
        assert "{" not in prompt and "}" not in prompt, (
            f"{key}: prompt contains format placeholders — "
            "user data must be XML-sandboxed at call time, not here"
        )


# ── AI5: .get() default must not change behavior for valid archetypes ───────────


@pytest.mark.parametrize("archetype", sorted(EXPECTED_KEYS))
def test_archetype_model_get_with_default_matches_direct_index(archetype: str) -> None:
    """ARCHETYPE_MODEL.get(archetype, <default>) must resolve identically to
    ARCHETYPE_MODEL[archetype] for every currently-valid archetype.

    _call_llm switched from direct indexing to .get() with a conservative
    default so a future archetype added to _ARCHETYPE before ARCHETYPE_MODEL is
    updated fails safe instead of raising KeyError. This must not change routing
    for any of the 7 archetypes that exist today.
    """
    assert ARCHETYPE_MODEL.get(archetype, "claude-haiku-4-5-20251001") == ARCHETYPE_MODEL[archetype]
