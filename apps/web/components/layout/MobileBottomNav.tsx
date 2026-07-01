"use client";

import { NAV_ITEMS } from "./nav-config";
import { MobileNavTab } from "./MobileNavTab";
import { MobileFAB } from "./MobileFAB";

const MOBILE_TABS = NAV_ITEMS.filter((item) => item.mobileShow);
const LEFT_TABS = MOBILE_TABS.slice(0, 2);
const RIGHT_TABS = MOBILE_TABS.slice(2);

export function MobileBottomNav() {
  return (
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
          fill="#161b22"
          stroke="#30363d"
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
  );
}
