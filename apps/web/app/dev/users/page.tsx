import { ForcedTheme } from "@/components/shared/forced-theme";
import { UsersTable } from "@/components/admin/UsersTable";
import type { AdminUser } from "@/lib/api";

/**
 * Dev-only preview (Effort 10, `08` §6). Renders the production `UsersTable`
 * with synthetic fixtures — the real `/admin/users` route is gated behind
 * `ADMIN_USER_IDS_CSV` (a FastAPI process env var), which isn't configurable
 * from an agent sandbox without touching a denied `.env` file, so this
 * preview is the only way to screenshot the populated states locally.
 * Mirrors the established `dev/admin-cost` fixture-preview pattern. Not part
 * of the shipping app.
 */
export default function DevUsersPreview() {
  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <UsersTable
        token="dev-token"
        initialUsers={USERS}
        initialLoadFailed={false}
      />
    </ForcedTheme>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const USERS: AdminUser[] = [
  {
    user_id: "a3f1c2e4-7b6d-4a91-9c3e-1f8d2b5e6a71",
    email: "jordan.reyes@example.com",
    display_name: "Jordan Reyes",
    created_at: "2026-05-02T00:00:00Z",
    banned_until: null,
    interactions_30d: 214,
  },
  {
    user_id: "d94e7c1a-2b3f-4c8d-9e01-6a5b3c7d8e12",
    email: "priya.nandan@example.com",
    display_name: "Priya Nandan",
    created_at: "2026-05-14T00:00:00Z",
    banned_until: null,
    interactions_30d: 168,
  },
  {
    user_id: "5b2a8f3c-1d4e-4f9a-8c6b-3e7d1a9f2b45",
    email: null,
    display_name: null,
    created_at: "2026-07-20T00:00:00Z",
    banned_until: null,
    interactions_30d: 0,
  },
  {
    user_id: "c1e8a4f2-9b3d-4e6c-a17f-2d8b5c3e9a01",
    email: "sam.okafor@example.com",
    display_name: "Sam Okafor",
    created_at: "2026-06-01T00:00:00Z",
    banned_until: null,
    interactions_30d: 98,
  },
  {
    user_id: "7f3c9e1a-4d2b-48f6-9a3e-1c7b8d2f5e60",
    email: "lena.kowalski@example.com",
    display_name: "Lena Kowalski",
    created_at: "2026-04-11T00:00:00Z",
    banned_until: null,
    interactions_30d: 3,
  },
];
