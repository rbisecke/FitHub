import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";

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
 * and redirect a non-admin away (`app/admin/layout.tsx`), so a stale or
 * over-eager "true" here could never actually grant access, only reveal an
 * affordance a redirect would immediately bounce.
 *
 * Revoked-invite detection: `is-admin` deliberately bypasses the invite gate (it
 * must answer even for a non-invited caller — see its route docstring), so it can
 * never surface a revoked invite. Every other authenticated route is gated by
 * `require_invited` (`apps/api/app/auth.py`), which 403s once a signed-in user's
 * email leaves `invited_emails`. A cheap `Auth`-gated call (`GET /api/v1/profile`)
 * is probed here for exactly that signal — a 403 can only mean "not invited" — and
 * routes the user to `/access-paused` (08 §1 "signed-in but not invited") instead
 * of leaving them on a shell that silently fails to load any data. Previously
 * nothing in the app ever redirected there, so a revoked user just saw a
 * half-broken authenticated shell instead of a clear "your access is paused"
 * state.
 *
 * `/admin/*` lives in its own top-level `app/admin/**` segment (not this
 * `(shell)` route group) so it never mounts inside `AppShell` below — the
 * admin console builds its own independent `SidebarProvider`/`SidebarInset`
 * shell (`app/admin/layout.tsx`), and nesting that inside `AppShell`'s own
 * `SidebarProvider`/`SidebarInset` produced a doubled `<main>` landmark plus
 * both instances fighting over the same unnamespaced `sidebar_state` cookie.
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

    try {
      await api.profile.get(session.access_token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        redirect("/access-paused");
      }
      // Any other failure (network blip, timeout) is non-fatal here — the
      // page's own data fetches will surface it normally.
    }
  }

  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
