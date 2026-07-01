"""Expand injuries.body_region CHECK constraint to include muscle and soft-tissue regions."""

from alembic import op

revision: str = "0042_injury_body_region_expand"
down_revision: str = "0041_add_variant_annotation"
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
    # muscle belly regions (Phase A)
    "hamstring",
    "quad",
    "calf",
    "glute",
    "upper_back",
    "chest",
    "bicep",
    "tricep",
    "lat",
    # soft-tissue / connective structures (Phase A)
    "hip_flexor",
    "it_band",
    "forearm",
    # fallback
    "other",
)

_IN_LIST = ", ".join(f"'{r}'" for r in _ALL_REGIONS)


def upgrade() -> None:
    op.execute("ALTER TABLE injuries DROP CONSTRAINT IF EXISTS injuries_body_region_check")
    op.execute(
        f"ALTER TABLE injuries ADD CONSTRAINT injuries_body_region_check "
        f"CHECK (body_region IN ({_IN_LIST}))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE injuries DROP CONSTRAINT IF EXISTS injuries_body_region_check")
    op.execute(
        "ALTER TABLE injuries ADD CONSTRAINT injuries_body_region_check "
        "CHECK (body_region IN ("
        "'shoulder','knee','hip','lower_back','wrist','elbow','ankle','neck','other'"
        "))"
    )
