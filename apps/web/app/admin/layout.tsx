import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { AdminNavSidebar } from "@/components/admin/AdminNavSidebar";
import { AdminConsoleHeader } from "@/components/admin/AdminConsoleHeader";
import { InfraStatusStrip } from "@/components/admin/InfraStatusStrip";
import { AdminConsoleGate } from "@/components/admin/AdminConsoleGate";

/**
 * Admin console shared shell (Effort 10; `08` §4) — every `/admin/*` route
 * mounts under this layout: the real shadcn `Sidebar` nav (mirrors
 * `desktop-sidebar.tsx`'s structure — not a bespoke fixed-width nav), the
 * "Exit admin" header bar, and the infra status strip pinned above every
 * page body. The desktop-only scope gate wraps the whole thing.
 *
 * Defense-in-depth gating: `(shell)/layout.tsx` already reads `is-admin` once
 * to decide whether to show the nav entry/switch INTO this console, but a
 * non-admin could still type `/admin/...` directly, so this layout
 * independently re-verifies `is-admin` server-side and redirects a non-admin
 * straight back to `/today` — the same principle this codebase applies to
 * backend ownership checks, not a UI-only gate the nav's absence would be
 * enough to enforce on its own.
 *
 * This shell's `SidebarProvider` persists its collapse state to its own
 * `admin_sidebar_state` cookie, not the member shell's shared `sidebar_state`
 * one (`components/ui/sidebar.tsx`'s `cookieName` prop) — otherwise
 * collapsing this sidebar would also leave the member `AppShell` sidebar
 * (`components/shell/app-shell.tsx`) collapsed on the next visit to a member
 * route, with no visible cause, since both would default to whichever value
 * was written last.
 */
const ADMIN_SIDEBAR_COOKIE = "admin_sidebar_state";
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let isAdmin = false;
  try {
    const status = await api.admin.isAdmin(session.access_token);
    isAdmin = status.is_admin;
  } catch {
    isAdmin = false; // fail closed — an errored check is treated as "not admin"
  }
  if (!isAdmin) redirect("/today");

  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SIDEBAR_COOKIE)?.value;
  const defaultOpen = raw !== undefined ? raw === "true" : true;

  return (
    <AdminConsoleGate>
      <ForcedTheme theme="dark" className="flex h-svh w-full">
        <SidebarProvider
          defaultOpen={defaultOpen}
          cookieName={ADMIN_SIDEBAR_COOKIE}
        >
          <AdminNavSidebar />
          <SidebarInset className="flex min-h-svh flex-col">
            {/* Shadowed as one unit so the seam against the light cost page
                (§7) reads as intentional layering — "a dark header bar over
                a light page" — rather than an abrupt, unstyled cutoff. */}
            <div className="relative z-10 shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
              <AdminConsoleHeader />
              <InfraStatusStrip accessToken={session.access_token} />
            </div>
            {/* Page body is deliberately NOT forced dark here — it inherits
                the ambient data-theme="dark" set above by default (five of
                the six admin pages are dark operator surfaces per the theme
                map), but the one light surface (cost dashboard, §7) opts out
                by wrapping its own content in `<ForcedTheme theme="light">`,
                the same nested-override pattern `MixedThemePlaceholder` uses
                elsewhere in this shell. The strip/nav chrome above stays a
                fixed dark bar regardless of what theme the body below picks —
                a "dark header bar over a light page" pattern. Deliberately NOT
                max-width-constrained here: the light cost page (§7) needs its
                background to full-bleed edge-to-edge under the strip, not sit
                in a dark-bordered box — each page constrains its own inner
                content column instead (see `PlaceholderScreen`). */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </ForcedTheme>
    </AdminConsoleGate>
  );
}
