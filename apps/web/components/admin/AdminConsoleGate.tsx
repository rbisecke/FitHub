"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { navHref } from "@/components/shell/nav-items";

/**
 * Desktop-only scope gate for the admin console (`08` §4) — a stated design
 * decision, not a responsive-layout gap. Below 768px the console does not
 * attempt to reflow its wide tables/dashboards; it renders a centered "best
 * viewed on a larger screen" notice in place of the console body instead.
 *
 * Reuses the same `useIsMobile` hook (768px breakpoint) the shadcn `Sidebar`
 * primitive itself uses internally, so this gate and the sidebar's own
 * mobile behavior read the identical breakpoint and can never disagree.
 */
export function AdminConsoleGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ForcedTheme
        theme="dark"
        className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground"
      >
        <Monitor className="size-8 text-[var(--amber)]" aria-hidden="true" />
        <p className="type-h3">Best viewed on a larger screen</p>
        <p className="type-small max-w-xs text-muted-foreground">
          The admin console is a desktop operator surface and doesn&apos;t
          reflow for mobile.
        </p>
        <Link
          href={navHref("today")}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 type-small text-foreground transition-colors duration-fast ease-standard hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the app
        </Link>
      </ForcedTheme>
    );
  }

  return <>{children}</>;
}
