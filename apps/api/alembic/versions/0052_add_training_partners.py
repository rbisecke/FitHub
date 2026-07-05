"""Add training_partners table for explicit partner relationships."""

from alembic import op

revision: str = "0052_add_training_partners"
down_revision: str = "0051_body_region_expand"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.training_partners (
            id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            partner_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            created_at  timestamptz NOT NULL DEFAULT now(),
            UNIQUE (user_id, partner_id),
            CHECK (user_id != partner_id)
        );

        CREATE INDEX IF NOT EXISTS ix_training_partners_user_id
            ON public.training_partners(user_id);

        ALTER TABLE public.training_partners ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "users manage their own partners"
            ON public.training_partners FOR ALL
            USING (auth.uid() = user_id);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.training_partners;")
