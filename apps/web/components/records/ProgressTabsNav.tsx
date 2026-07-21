"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEGMENTS = [
  { href: "/progress/records", label: "Records" },
  { href: "/progress/load", label: "Load" },
  { href: "/progress/volume", label: "Volume" },
  { href: "/progress/balance", label: "Balance" },
  { href: "/progress/benchmarks", label: "Benchmarks" },
] as const;

/**
 * Progress-tab segmented nav (design-spec 04 "Navigation" + Component
 * mapping — the shadcn `Tabs` role, applied to routed segments rather than
 * in-place panels since each segment is its own top-level analytics screen
 * built by a different effort). A plain `Link` list styled as a segmented
 * control rather than the base-ui `Tabs` primitive itself: that primitive
 * owns its active-tab state internally and switches panels in place, which
 * doesn't fit five independently-routed pages — Link + `aria-current`
 * reproduces the same segmented look and keyboard/AT semantics without
 * fighting a state machine built for a different navigation model.
 *
 * Forced dark regardless of the page beneath it: this bar is persistent nav
 * chrome sitting above screens that individually flip dark/light per the
 * theme-per-moment rule (Records + Benchmarks dark, Load/Volume/Balance
 * light) — keeping the bar itself always-dark avoids the segmented control
 * flickering theme as the user switches segments.
 */
export function ProgressTabsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Progress sections"
      className="relative border-b border-[var(--border)] bg-[var(--bg)] px-4 md:px-8"
    >
      <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto py-2">
        {SEGMENTS.map((segment) => {
          const active =
            pathname === segment.href ||
            pathname.startsWith(`${segment.href}/`);
          return (
            <Link
              key={segment.href}
              href={segment.href}
              aria-current={active ? "page" : undefined}
              className="shrink-0 rounded-[8px] px-3 py-1.5 font-sans text-[13px] font-medium whitespace-nowrap transition-colors"
              style={{
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--text)" : "var(--muted)",
              }}
            >
              {segment.label}
            </Link>
          );
        })}
      </div>
      {/* Right-edge fade — signals "more tabs, scroll" rather than a cut-off
          layout bug when the segmented set overflows a narrow viewport. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 md:hidden"
        style={{
          background: "linear-gradient(to right, transparent, var(--bg))",
        }}
      />
    </nav>
  );
}
