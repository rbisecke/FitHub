"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, navHref } from "./nav-items";
import { isSegmentActive } from "./active-segment";
import { QuickLogFab } from "./quick-log-fab";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom-tab bar (Effort 1, steps 1.2 + 1.3; `00` Part 4).
 *
 * The five primary tabs as a thumb-reachable fixed bar, with the quick-log FAB
 * centered and perched on the bar's top edge (CLAUDE.md's inset-FAB intent; a true
 * center notch isn't available because all five tabs occupy the bar — see the FAB
 * placement note below). Mobile-only — hidden from `md:` up, where the desktop
 * `Sidebar` takes over. The bar clears the home-indicator safe area via
 * `env(safe-area-inset-bottom)`.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border bg-card",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {/* FAB — centered, rising out of the bar's top edge. Pulled down so it
          overlaps the bar's empty top-padding strip (the `--bg` ring carves a
          notch-like halo into the bar), which reads as perched rather than
          floating while staying clear of the dead-center Plan icon — that icon
          sits at the bar's bottom, below the overlap. */}
      <QuickLogFab className="absolute bottom-full left-1/2 z-10 -mb-2.5 -translate-x-1/2" />

      <ul className="flex h-16 items-stretch">
        {PRIMARY_NAV.map((item) => {
          const active = isSegmentActive(pathname, item.segment);
          const Icon = item.icon;
          return (
            <li key={item.segment} className="flex-1">
              <Link
                href={navHref(item.segment)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-end gap-1 pb-2 pt-3",
                  "transition-colors duration-fast ease-standard",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
                  active
                    ? "text-[var(--accent)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Non-color active cue (a shape/position signal in addition to
                    the accent tint) so state isn't encoded by color alone. */}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--accent)]"
                  />
                ) : null}
                <Icon
                  className="size-6"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span className="type-caption text-current">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
