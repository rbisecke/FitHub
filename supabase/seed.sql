-- Local development seed data.
-- Loaded by `supabase db reset` (see [db.seed] in config.toml).
-- Never runs in production — manage invites via the admin API there.

INSERT INTO public.invited_emails (email)
VALUES ('dev@example.com')
ON CONFLICT (email) DO NOTHING;
