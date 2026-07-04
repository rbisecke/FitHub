"""Expand injuries.body_region CHECK constraint with tendon and foot regions from Step 2."""

from alembic import op

revision: str = "0051_body_region_expand"
down_revision: str = "0050_injury_permanent_status"
branch_labels = None
depends_on = None

_ALL_REGIONS = (
    # joint regions (original 9)
    "shoulder",
    "knee",
    "hip",
    "lower_back",
    "wrist",
    "elbow",
    "ankle",
    "neck",
    # muscle belly regions
    "hamstring",
    "quad",
    "calf",
    "glute",
    "upper_back",
    "chest",
    "bicep",
    "tricep",
    "lat",
    # soft-tissue / connective structures
    "hip_flexor",
    "it_band",
    "forearm",
    # tendon / soft tissue additions (Step 2)
    "rotator_cuff",
    "patellar_tendon",
    "lateral_elbow",
    "medial_elbow",
    # foot / plantar (Step 2)
    "arch",
    "achilles",
    "shin",
    # joint additions (Step 2)
    "groin",
    "si_joint",
    # fallback
    "other",
)

_IN_LIST = ", ".join(f"'{r}'" for r in _ALL_REGIONS)

_ROLLBACK_REGIONS = (
    "shoulder",
    "knee",
    "hip",
    "lower_back",
    "wrist",
    "elbow",
    "ankle",
    "neck",
    "hamstring",
    "quad",
    "calf",
    "glute",
    "upper_back",
    "chest",
    "bicep",
    "tricep",
    "lat",
    "hip_flexor",
    "it_band",
    "forearm",
    "other",
)
_ROLLBACK_IN_LIST = ", ".join(f"'{r}'" for r in _ROLLBACK_REGIONS)


def upgrade() -> None:
    op.execute("ALTER TABLE injuries DROP CONSTRAINT IF EXISTS injuries_body_region_check")
    op.execute(
        f"ALTER TABLE injuries ADD CONSTRAINT injuries_body_region_check "
        f"CHECK (body_region IN ({_IN_LIST}))"
    )


def downgrade() -> None:
    new_regions = (
        "rotator_cuff",
        "patellar_tendon",
        "lateral_elbow",
        "medial_elbow",
        "arch",
        "achilles",
        "shin",
        "groin",
        "si_joint",
    )
    placeholders = ", ".join(f"'{r}'" for r in new_regions)
    op.execute(f"DELETE FROM injuries WHERE body_region IN ({placeholders})")
    op.execute("ALTER TABLE injuries DROP CONSTRAINT IF EXISTS injuries_body_region_check")
    op.execute(
        f"ALTER TABLE injuries ADD CONSTRAINT injuries_body_region_check "
        f"CHECK (body_region IN ({_ROLLBACK_IN_LIST}))"
    )
