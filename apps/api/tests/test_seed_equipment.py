"""Unit tests for seed_movement_equipment.py.

All tests are pure unit tests — no DB connection required.
"""

from __future__ import annotations

import pytest

from scripts.seed_movement_equipment import EQUIPMENT, VALID_TAGS, validate_tags


def test_all_tags_are_valid() -> None:
    """Every tag in the seed dict must be in VALID_TAGS."""
    for movement, tags in EQUIPMENT.items():
        for tag in tags:
            assert tag in VALID_TAGS, (
                f"Movement '{movement}' has invalid tag '{tag}'. Valid tags: {sorted(VALID_TAGS)}"
            )


def test_seed_dict_has_at_least_40_entries() -> None:
    assert len(EQUIPMENT) >= 40, (
        f"Seed dict has only {len(EQUIPMENT)} entries; expected at least 40."
    )


def test_no_movement_has_empty_equipment_list() -> None:
    """Every movement must declare at least one equipment tag."""
    empty = [name for name, tags in EQUIPMENT.items() if not tags]
    assert not empty, (
        f"Movements with empty equipment_required: {empty}. "
        "Use ['bodyweight'] for bodyweight-only movements."
    )


def test_validate_tags_passes_for_valid_dict() -> None:
    """validate_tags should not raise when all tags are valid."""
    validate_tags(EQUIPMENT)  # must not raise


def test_validate_tags_rejects_invalid_tag() -> None:
    """validate_tags must raise ValueError before any DB call when a bad tag is present."""
    bad_data = {"Air Squat": ["bodyweight", "yoga_mat"]}
    with pytest.raises(ValueError, match="yoga_mat"):
        validate_tags(bad_data)


def test_validate_tags_rejects_multiple_invalid_tags() -> None:
    """All bad tags in the dict are reported in a single ValueError."""
    bad_data = {
        "Movement A": ["barbell", "treadmill"],
        "Movement B": ["rings", "foam_roller"],
    }
    with pytest.raises(ValueError) as exc_info:
        validate_tags(bad_data)
    msg = str(exc_info.value)
    assert "treadmill" in msg
    assert "foam_roller" in msg


def test_valid_tags_set_is_complete() -> None:
    """Sanity-check that VALID_TAGS contains exactly the 12 documented tags."""
    expected = {
        "barbell",
        "rack",
        "dumbbells",
        "kettlebell",
        "pull_up_bar",
        "rings",
        "rower",
        "bike",
        "ski",
        "bodyweight",
        "jump_rope",
        "resistance_band",
    }
    assert expected == VALID_TAGS


def test_known_movements_present() -> None:
    """Spot-check that key movements from each category are in the seed dict."""
    must_have = [
        # Olympic lifts
        "Snatch",
        "Clean and Jerk",
        "Power Clean",
        "Hang Power Snatch",
        # Barbell strength
        "Back Squat",
        "Deadlift",
        "Bench Press",
        "Strict Press",
        # Gymnastics — bar
        "Pull-Up",
        "Toes-to-Bar",
        "Bar Muscle-Up",
        # Gymnastics — rings
        "Ring Muscle-Up",
        "Ring Dip",
        # Bodyweight
        "Air Squat",
        "Burpee",
        "Push-Up",
        "Handstand Push-Up",
        # Cardio
        "Row",
        "Assault Bike",
        "Ski Erg",
        "Double-Under",
        # Dumbbell / kettlebell
        "Dumbbell Snatch",
        "Kettlebell Swing",
        "Turkish Get-Up",
    ]
    missing = [m for m in must_have if m not in EQUIPMENT]
    assert not missing, f"Expected movements missing from seed dict: {missing}"


def test_rack_movements_also_have_barbell() -> None:
    """Any movement tagged 'rack' must also be tagged 'barbell' (rack needs a bar)."""
    rack_without_barbell = [
        name for name, tags in EQUIPMENT.items() if "rack" in tags and "barbell" not in tags
    ]
    assert not rack_without_barbell, (
        f"Movements with 'rack' but no 'barbell': {rack_without_barbell}"
    )
