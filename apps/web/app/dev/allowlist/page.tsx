import { ForcedTheme } from "@/components/shared/forced-theme";
import { AllowlistScreen } from "@/components/admin/AllowlistScreen";
import type { AdminInvitedEmail } from "@/lib/api";

/**
 * Dev-only preview (Effort 10, `08` §9). Renders the production
 * `AllowlistScreen` with synthetic fixtures — the real `/admin/allowlist`
 * route is gated behind `ADMIN_USER_IDS_CSV` (a FastAPI process env var),
 * which isn't configurable from an agent sandbox without touching a denied
 * `.env` file, so this preview is the only way to screenshot the populated
 * consumed/unused states locally. Mirrors the established `dev/admin-cost`
 * fixture-preview pattern. Not part of the shipping app.
 */
export default function DevAllowlistPreview() {
  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <AllowlistScreen
        token="dev-token"
        initialEmails={EMAILS}
        initialLoadFailed={false}
      />
    </ForcedTheme>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const EMAILS: AdminInvitedEmail[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "jordan.reyes@example.com",
    invited_at: "2026-07-20T14:32:00Z",
    used_at: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "priya.nandan@example.com",
    invited_at: "2026-07-18T09:05:00Z",
    used_at: "2026-07-19T11:47:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    email: "sam.okafor@example.com",
    invited_at: "2026-07-15T18:20:00Z",
    used_at: "2026-07-16T08:03:00Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    email: "lena.kowalski@example.com",
    invited_at: "2026-07-10T07:41:00Z",
    used_at: null,
  },
];
