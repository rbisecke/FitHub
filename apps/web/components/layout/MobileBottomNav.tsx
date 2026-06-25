"use client";

import { NAV_ITEMS } from "./nav-config";
import { MobileNavTab } from "./MobileNavTab";
import { MobileFAB } from "./MobileFAB";

const LEFT_TABS = NAV_ITEMS.slice(0, 2); // Dashboard, Records
const RIGHT_TABS = NAV_ITEMS.slice(2); // History, Progress

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className={[
        "md:hidden",
        "fixed bottom-0 inset-x-0 z-50",
        "flex items-stretch h-16",
        "bg-[var(--surface)] border-t border-[var(--border)]",
        // Safe area for iPhone notch / home indicator
        "[padding-bottom:env(safe-area-inset-bottom)]",
      ].join(" ")}
      style={{ height: "calc(64px + env(safe-area-inset-bottom))" }}
    >
      {LEFT_TABS.map((item) => (
        <MobileNavTab
          key={item.href}
          href={item.href}
          label={item.mobileLabel}
          icon={item.icon}
        />
      ))}

      <MobileFAB />

      {RIGHT_TABS.map((item) => (
        <MobileNavTab
          key={item.href}
          href={item.href}
          label={item.mobileLabel}
          icon={item.icon}
        />
      ))}
    </nav>
  );
}
