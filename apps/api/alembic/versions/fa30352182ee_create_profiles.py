"""Create profiles table with RLS, updated_at trigger, and auth user trigger.

Revision ID: fa30352182ee
Revises:
Create Date: 2026-06-18 14:40:46.577961

"""

from alembic import op

revision: str = "fa30352182ee"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── Table ──────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE public.profiles (
            id               uuid         NOT NULL PRIMARY KEY
                             REFERENCES   auth.users(id) ON DELETE CASCADE,
            handle           text         UNIQUE,
            display_name     text,
            unit_preference  text         NOT NULL DEFAULT 'kg'
                             CHECK        (unit_preference IN ('kg', 'lb')),
            timezone         text         NOT NULL DEFAULT 'UTC',
            bodyweight       numeric(6,2),
            role             text         NOT NULL DEFAULT 'user'
                             CHECK        (role IN ('user', 'admin')),
            created_at       timestamptz  NOT NULL DEFAULT now(),
            updated_at       timestamptz  NOT NULL DEFAULT now()
        )
    """)

    # ── updated_at trigger ─────────────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION public.set_updated_at()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$
    """)

    op.execute("DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles")
    op.execute("""
        CREATE TRIGGER profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    """)

    # ── Auto-create profile row after user signup ──────────────────────────────
    # SECURITY DEFINER + fixed search_path prevents privilege escalation.
    # Exception handler covers the unlikely event of a handle collision.
    op.execute("""
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public AS $$
        BEGIN
          INSERT INTO public.profiles (id, handle, display_name)
          VALUES (
            NEW.id,
            split_part(NEW.email, '@', 1)
              || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
            split_part(NEW.email, '@', 1)
          )
          ON CONFLICT (id) DO NOTHING;
          RETURN NEW;
        EXCEPTION WHEN unique_violation THEN
          -- Handle collision: fall back to full UUID-derived suffix (globally unique).
          INSERT INTO public.profiles (id, handle, display_name)
          VALUES (
            NEW.id,
            '_u_' || replace(NEW.id::text, '-', ''),
            split_part(NEW.email, '@', 1)
          )
          ON CONFLICT (id) DO NOTHING;
          RETURN NEW;
        END;
        $$
    """)

    op.execute("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users")
    op.execute("""
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
    """)

    # ── Row Level Security ─────────────────────────────────────────────────────
    op.execute("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "profiles_self_select"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (id = auth.uid())
    """)

    # WITH CHECK prevents cross-row writes but role is excluded from the grant
    # below, so users cannot self-promote regardless of this policy.
    op.execute("""
        CREATE POLICY "profiles_self_update"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING  (id = auth.uid())
            WITH CHECK (id = auth.uid())
    """)

    # Column-level grant: authenticated users cannot update role, created_at,
    # or updated_at — preventing self-promotion to admin.
    op.execute("GRANT SELECT ON public.profiles TO authenticated")
    op.execute("""
        GRANT UPDATE(handle, display_name, unit_preference, timezone, bodyweight)
            ON public.profiles TO authenticated
    """)
    op.execute("GRANT ALL ON public.profiles TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.profiles FROM authenticated")
    op.execute("REVOKE ALL ON public.profiles FROM service_role")
    op.execute('DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles')
    op.execute('DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles')
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users")
    op.execute("DROP FUNCTION IF EXISTS public.handle_new_user()")
    op.execute("DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles")
    op.execute("DROP FUNCTION IF EXISTS public.set_updated_at()")
    op.execute("DROP TABLE IF EXISTS public.profiles")
