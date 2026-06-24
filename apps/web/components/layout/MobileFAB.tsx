"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { LOG_CTA } from "./nav-config";

export function MobileFAB() {
  return (
    <div className="relative flex flex-1 items-center justify-center">
      {/* Notch — page background circle that creates a visual cutout */}
      <div
        aria-hidden
        className="absolute top-0 -translate-y-1/2 h-[60px] w-[60px] rounded-full bg-[var(--bg)]"
      />
      {/* FAB */}
      <Link
        href={LOG_CTA.href}
        aria-label="Log a workout"
        className={[
          "absolute top-0 -translate-y-3",
          "h-14 w-14 rounded-full z-10",
          "bg-[var(--accent)] hover:bg-[var(--accent)]/90",
          "flex items-center justify-center",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[var(--bg)]",
          // Touch target is exactly 56px (≥ 44px requirement)
        ].join(" ")}
      >
        <Plus className="h-5 w-5 text-[var(--bg)] shrink-0" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
