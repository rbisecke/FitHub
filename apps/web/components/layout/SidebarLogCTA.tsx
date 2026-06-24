"use client";

import Link from "next/link";
import { GitCommit } from "lucide-react";
import { LOG_CTA } from "./nav-config";

export function SidebarLogCTA() {
  return (
    <div className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
      <Link
        href={LOG_CTA.href}
        aria-label={LOG_CTA.label}
        className={[
          // Expanded: full-width filled button
          "flex items-center justify-center gap-2 w-full",
          "bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg)]",
          "rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
          // Collapsed: square icon-only button
          "group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10",
          "group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:p-0",
        ].join(" ")}
      >
        <GitCommit className="h-4 w-4 shrink-0" />
        <span className="group-data-[collapsible=icon]:hidden">
          {LOG_CTA.label}
        </span>
      </Link>
      <p className="mt-1 font-mono text-[10px] text-[var(--muted)] text-center group-data-[collapsible=icon]:hidden">
        {LOG_CTA.gitCommand}
      </p>
    </div>
  );
}
