"""Create invited_emails allowlist and before_user_created auth hook.

Revision ID: 28f0f144919b
Revises: fa30352182ee
Create Date: 2026-06-18 14:41:45.724082

"""

from alembic import op

revision: str = "28f0f144919b"
down_revision: str | None = "fa30352182ee"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── Invite allowlist ───────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE public.invited_emails (
            id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            email       text        NOT NULL UNIQUE,
            invited_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
            invited_at  timestamptz NOT NULL DEFAULT now(),
            used_at     timestamptz
        )
    """)

    op.execute("ALTER TABLE public.invited_emails ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.invited_emails FORCE ROW LEVEL SECURITY")

    # Only the backend (service_role) manages invites — no authenticated access.
    op.execute("GRANT ALL ON public.invited_emails TO service_role")

    # ── before_user_created auth hook ──────────────────────────────────────────
    # Supabase calls this before creating any new auth.users row.
    # Returning {"decision":"reject"} aborts the signup.
    # UPDATE ... WHERE used_at IS NULL is atomic — no TOCTOU race between
    # the existence check and the stamp.
    op.execute("""
        CREATE OR REPLACE FUNCTION public.before_user_created_hook(event jsonb)
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          user_email text;
        BEGIN
          user_email := event ->> 'email';

          IF user_email IS NULL THEN
            RETURN jsonb_build_object('decision', 'reject', 'message', 'Email is required');
          END IF;

          UPDATE public.invited_emails
          SET    used_at = now()
          WHERE  lower(email) = lower(user_email)
          AND    used_at IS NULL;

          IF NOT FOUND THEN
            RETURN jsonb_build_object(
              'decision', 'reject',
              'message',  'This email address is not on the invite list'
            );
          END IF;

          RETURN jsonb_build_object('decision', 'continue');
        END;
        $$
    """)

    # Grant the Supabase auth service execute permission on the hook.
    op.execute("""
        GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb)
            TO supabase_auth_admin
    """)


def downgrade() -> None:
    op.execute(
        "REVOKE EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) FROM supabase_auth_admin"
    )
    op.execute("DROP FUNCTION IF EXISTS public.before_user_created_hook(jsonb)")
    op.execute("REVOKE ALL ON public.invited_emails FROM service_role")
    op.execute("DROP TABLE IF EXISTS public.invited_emails")
