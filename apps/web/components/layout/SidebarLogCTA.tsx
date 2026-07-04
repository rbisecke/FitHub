"use client";

import Link from "next/link";
import { GitCommit, Tag } from "lucide-react";
import { LOG_CTA } from "./nav-config";

const TAG_CTA = {
  href: "/log/tag",
  label: "$ git tag",
  subLabel: "Tag a milestone",
} as const;

export function SidebarLogCTA() {
  return (
    <div className="px-2 space-y-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:space-y-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
      {/* Primary: Log Workout */}
      <div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <Link
          href={LOG_CTA.href}
          aria-label={LOG_CTA.label}
          className={[
            "flex items-center justify-center gap-2 w-full",
            "bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg)]",
            "rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
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

      {/* Secondary: Tag a milestone */}
      <div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <Link
          href={TAG_CTA.href}
          aria-label={TAG_CTA.subLabel}
          className={[
            "flex items-center justify-center gap-2 w-full",
            "border border-[var(--border)] hover:border-[var(--gold)] text-[var(--muted)] hover:text-[var(--gold)]",
            "rounded-md px-3 transition-colors",
            // Expanded: normal height with text
            "py-2 min-h-[36px]",
            // Collapsed: square icon-only
            "group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-9",
            "group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:min-h-0",
          ].join(" ")}
        >
          <Tag className="h-3.5 w-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden flex flex-col items-start">
            <span className="font-mono text-xs font-semibold leading-tight">
              {TAG_CTA.label}
            </span>
            <span className="font-sans text-[10px] leading-tight opacity-70">
              {TAG_CTA.subLabel}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
