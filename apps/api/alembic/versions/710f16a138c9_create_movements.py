"""Create movements catalog table.

Revision ID: 710f16a138c9
Revises: 28f0f144919b
Create Date: 2026-06-18

"""

from alembic import op

revision: str = "710f16a138c9"
down_revision: str | None = "28f0f144919b"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.movements (
            id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            name                 text        NOT NULL UNIQUE,
            slug                 text        NOT NULL UNIQUE,
            base_movement        text        NOT NULL,
            modality             text        NOT NULL
                CHECK (modality IN (
                    'strength', 'weightlifting', 'gymnastics',
                    'mono_structural', 'wod'
                )),
            start_position       text,
            catch_position       text,
            pause_position       text,
            tempo                varchar(8)
                CHECK (tempo ~ '^[0-9X]{1,2}[0-9X]{1,2}[0-9X]{1,2}[0-9X]{1,2}$'),
            implement            text,
            default_result_types text[]      NOT NULL DEFAULT '{}',
            is_official          boolean     NOT NULL DEFAULT false,
            created_by           uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
            created_at           timestamptz NOT NULL DEFAULT now(),
            updated_at           timestamptz NOT NULL DEFAULT now()
        )
    """)

    # Reuse set_updated_at() created in the profiles migration.
    op.execute("DROP TRIGGER IF EXISTS movements_updated_at ON public.movements")
    op.execute("""
        CREATE TRIGGER movements_updated_at
            BEFORE UPDATE ON public.movements
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    """)

    op.execute("CREATE INDEX movements_modality_idx   ON public.movements (modality)")
    op.execute("CREATE INDEX movements_created_by_idx ON public.movements (created_by)")

    # All authenticated users may read the catalog; only creators may mutate custom entries.
    op.execute("ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.movements FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "movements_authenticated_select"
            ON public.movements FOR SELECT TO authenticated USING (true)
    """)
    op.execute("""
        CREATE POLICY "movements_owner_insert"
            ON public.movements FOR INSERT TO authenticated
            WITH CHECK (created_by = auth.uid() AND is_official = false)
    """)
    op.execute("""
        CREATE POLICY "movements_owner_update"
            ON public.movements FOR UPDATE TO authenticated
            USING  (created_by = auth.uid() AND is_official = false)
            WITH CHECK (created_by = auth.uid() AND is_official = false)
    """)
    op.execute("""
        CREATE POLICY "movements_owner_delete"
            ON public.movements FOR DELETE TO authenticated
            USING (created_by = auth.uid() AND is_official = false)
    """)

    op.execute("GRANT SELECT ON public.movements TO authenticated")
    op.execute("""
        GRANT INSERT (name, slug, base_movement, modality, start_position,
                      catch_position, pause_position, tempo, implement,
                      default_result_types, created_by)
            ON public.movements TO authenticated
    """)
    op.execute("""
        GRANT UPDATE (name, slug, base_movement, modality, start_position,
                      catch_position, pause_position, tempo, implement,
                      default_result_types)
            ON public.movements TO authenticated
    """)
    op.execute("GRANT DELETE ON public.movements TO authenticated")
    op.execute("GRANT ALL   ON public.movements TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.movements FROM authenticated")
    op.execute("REVOKE ALL ON public.movements FROM service_role")
    for p in (
        "movements_owner_delete",
        "movements_owner_update",
        "movements_owner_insert",
        "movements_authenticated_select",
    ):
        op.execute(f'DROP POLICY IF EXISTS "{p}" ON public.movements')
    op.execute("DROP TRIGGER IF EXISTS movements_updated_at ON public.movements")
    op.execute("DROP INDEX IF EXISTS movements_modality_idx")
    op.execute("DROP INDEX IF EXISTS movements_created_by_idx")
    op.execute("DROP TABLE IF EXISTS public.movements")
