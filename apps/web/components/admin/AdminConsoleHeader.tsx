import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navHref } from "@/components/shell/nav-items";

/**
 * Console shell chrome: the sidebar collapse trigger plus the "Exit admin"
 * switch OUT of the operator console and back to the member shell (`00` Part 4 /
 * `08` §4). The switch IN is the admin-gated "Admin console" entry in the
 * account menu (`account-menu.tsx`). An amber accent (privileged/caution, not
 * the ordinary `--accent` blue) marks this as a distinct, elevated mode rather
 * than an ordinary page header — the same treatment the original `/admin` stub
 * used, carried over here as the console's permanent chrome rather than a
 * one-off page header.
 *
 * The crossing is an abrupt cut, not a cross-fade (`08` §4) — this link is a
 * plain navigation, no transition animation.
 */
export function AdminConsoleHeader() {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--amber)]/40 bg-background px-4 py-2 text-foreground">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span aria-hidden="true" className="h-5 w-px bg-border" />
        <span className="rounded-full border border-[var(--amber)] px-2 py-0.5 type-caption font-mono uppercase tracking-wide text-[var(--amber)]">
          Admin
        </span>
        <span aria-hidden="true" className="type-caption text-muted-foreground">
          »
        </span>
        <span className="type-caption font-mono text-muted-foreground">
          Operator console
        </span>
      </div>
      <Link
        href={navHref("today")}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--amber)]/40 px-2.5 type-small text-foreground transition-colors duration-fast ease-standard hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Exit admin
      </Link>
    </div>
  );
}
