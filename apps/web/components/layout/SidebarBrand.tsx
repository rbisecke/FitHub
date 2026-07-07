"use client";

import { FitHubMark } from "./FitHubMark";

export function SidebarBrand() {
  return (
    <div className="select-none">
      {/* Expanded: mark + wordmark + branch indicator */}
      <div className="flex items-center gap-[11px] px-1 group-data-[collapsible=icon]:hidden">
        <FitHubMark size={34} decorative />
        <div className="flex-1 min-w-0">
          <div className="font-heading text-[18px] text-[var(--text)] tracking-[-0.5px] leading-none">
            FitHub
          </div>
          <div className="flex items-center gap-[5px] mt-[2px]">
            <span
              className="shrink-0 rounded-full bg-[var(--accent)]"
              style={{ width: 7, height: 7 }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-[var(--muted)] font-mono leading-none">
              main
            </span>
          </div>
        </div>
      </div>
      {/* Collapsed: mark only, centered */}
      <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
        <FitHubMark size={34} />
      </div>
    </div>
  );
}
