import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";

/**
 * Redesign app-shell layout (Effort 1, `00` Part 4; real gating landed Effort 10).
 *
 * Wraps every routed screen in the `(shell)` group's bare-path routes in the global
 * nav chrome (`AppShell`). A Server Component; `AppShell` is server-rendered too, so
 * the placeholder route segments stay on the server. Signed-out visitors never reach
 * here — middleware redirects them to `/login` before render.
 *
 * `isAdmin` now reads the real allowlist via `GET /api/v1/admin/is-admin` instead of
 * the earlier hardcoded placeholder. A missing session or a failed/timed-out call
 * fails closed (treated as non-admin) — this call only controls whether the admin
 * nav item / role-switch affordance is *shown*; it is not the security boundary.
 * The `/admin/*` routes themselves independently re-verify `is-admin` server-side
 * and redirect a non-admin away (`app/(shell)/admin/layout.tsx`), so a stale or
 * over-eager "true" here could never actually grant access, only reveal an
 * affordance a redirect would immediately bounce.
 */
export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let isAdmin = false;
  if (session) {
    try {
      const status = await api.admin.isAdmin(session.access_token);
      isAdmin = status.is_admin;
    } catch {
      isAdmin = false;
    }
  }

  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
