import { ForcedTheme } from "@/components/shared/forced-theme";
import { AccessRequestsPanel } from "@/components/admin/AccessRequestsPanel";
import type { AdminAccessRequest, AdminUser } from "@/lib/api";

/**
 * Dev-only preview (Effort 10, `08` §5). Renders the production
 * `AccessRequestsPanel` with synthetic fixtures — the real `/admin/access-requests`
 * route is gated behind `ADMIN_USER_IDS_CSV` (a FastAPI process env var), which
 * isn't configurable from an agent sandbox without touching a denied `.env`
 * file, so this preview is the only way to screenshot the populated states
 * locally. Mirrors the established `dev/admin-cost` fixture-preview pattern.
 * Not part of the shipping app.
 */
export default function DevAccessRequestsPreview() {
  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <AccessRequestsPanel
        initial={REQUESTS}
        initialLoadFailed={false}
        users={USERS}
        token="dev-token"
      />
    </ForcedTheme>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const REQUESTS: AdminAccessRequest[] = [
  {
    id: "req-1",
    created_at: "2026-07-20T14:32:00Z",
    email: "jordan.reyes@example.com",
    name: "Jordan Reyes",
    motivation:
      "A friend at my box uses FitHub and showed me the contribution graph — I want to start tracking my Olympic lifts properly.",
    status: "pending",
    reviewed_at: null,
    reviewed_by: null,
    review_note: null,
  },
  {
    id: "req-2",
    created_at: "2026-07-21T09:05:00Z",
    email: "sam.okafor@example.com",
    name: "Sam Okafor",
    motivation: "",
    status: "pending",
    reviewed_at: null,
    reviewed_by: null,
    review_note: null,
  },
  {
    id: "req-3",
    created_at: "2026-07-15T11:00:00Z",
    email: "priya.nandan@example.com",
    name: "Priya Nandan",
    motivation: "Coach recommended it for programming my meet prep block.",
    status: "approved",
    reviewed_at: "2026-07-16T08:12:00Z",
    reviewed_by: "11111111-1111-1111-1111-111111111111",
    review_note: null,
  },
  {
    id: "req-4",
    created_at: "2026-07-10T16:45:00Z",
    email: "unresolved.user@example.com",
    name: "Unresolved User",
    motivation: "Saw a post about the git-themed workout tracker.",
    status: "approved",
    reviewed_at: "2026-07-11T10:00:00Z",
    reviewed_by: "11111111-1111-1111-1111-111111111111",
    review_note: null,
  },
  {
    id: "req-5",
    created_at: "2026-07-05T12:00:00Z",
    email: "lena.kowalski@example.com",
    name: "Lena Kowalski",
    motivation: "General fitness tracking interest.",
    status: "rejected",
    reviewed_at: "2026-07-06T09:30:00Z",
    reviewed_by: "11111111-1111-1111-1111-111111111111",
    review_note: "Not a fit for the invite-only pilot right now.",
  },
];

// `priya.nandan@example.com` resolves to a real user below, so req-3's
// approved row shows a live "Copy magic link" shortcut; req-4's email has no
// matching user (demonstrating the "no matching signed-in account yet" gap
// note).
const USERS: AdminUser[] = [
  {
    user_id: "d94e7c1a-2b3f-4c8d-9e01-6a5b3c7d8e12",
    email: "priya.nandan@example.com",
    display_name: "Priya Nandan",
    created_at: "2026-07-16T08:12:00Z",
    banned_until: null,
    interactions_30d: 6,
  },
];
