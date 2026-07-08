"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, MOBILE_MORE_ITEMS, ADMIN_NAV_ITEM } from "./nav-config";
import { MobileNavTab } from "./MobileNavTab";
import { MobileFAB } from "./MobileFAB";
import { MobileMoreSheet } from "./MobileMoreSheet";

// Tab bar items: Dashboard, History, [FAB], Coach, More
const MOBILE_TABS = NAV_ITEMS.filter((item) => item.mobileShow);
const LEFT_TABS = MOBILE_TABS.slice(0, 2);
const RIGHT_TABS = MOBILE_TABS.slice(2);

// The "More" tab is active when the sheet is open or when the current page is
// only reachable via the More sheet (not a direct tab).
const MORE_HREFS = new Set([
  ...MOBILE_MORE_ITEMS.map((i) => i.href),
  ADMIN_NAV_ITEM.href,
]);

interface Props {
  isAdmin?: boolean;
}

export function MobileBottomNav({ isAdmin }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const moreActive =
    moreOpen || [...MORE_HREFS].some((h) => pathname.startsWith(h));

  return (
    <>
      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        isAdmin={isAdmin}
      />

      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ height: "calc(88px + env(safe-area-inset-bottom))" }}
      >
        {/* SVG notch background */}
        <svg
          viewBox="0 0 375 88"
          width="100%"
          height="88"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: "env(safe-area-inset-bottom)",
            left: 0,
            display: "block",
          }}
          aria-hidden="true"
        >
          <path
            d="M0 12 L138 12 A12 12 0 0 1 149 18 A40 40 0 0 0 226 18 A12 12 0 0 1 237 12 L375 12 L375 88 L0 88 Z"
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="1"
          />
        </svg>

        {/* Tab items row */}
        <div
          style={{
            position: "absolute",
            bottom: "env(safe-area-inset-bottom)",
            left: 0,
            right: 0,
            height: 76,
            display: "flex",
            alignItems: "flex-start",
            paddingTop: 12,
          }}
        >
          {LEFT_TABS.map((item) => (
            <MobileNavTab
              key={item.href}
              href={item.href}
              label={item.mobileLabel}
              icon={item.icon}
            />
          ))}

          {/* Notch spacer */}
          <div style={{ width: 88, flexShrink: 0 }} aria-hidden="true" />

          {RIGHT_TABS.map((item) => (
            <MobileNavTab
              key={item.href}
              href={item.href}
              label={item.mobileLabel}
              icon={item.icon}
            />
          ))}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 pt-1",
              "transition-colors focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm",
              moreActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
            )}
          >
            <LayoutGrid className="h-5 w-5 shrink-0" />
            <span className="font-data text-[9.5px] font-semibold">More</span>
          </button>
        </div>

        {/* FAB */}
        <MobileFAB />

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(env(safe-area-inset-bottom) + 8px)",
            transform: "translateX(-50%)",
            width: 134,
            height: 5,
            borderRadius: 3,
            background: "var(--muted)",
            opacity: 0.4,
          }}
          aria-hidden="true"
        />
      </nav>
    </>
  );
}
