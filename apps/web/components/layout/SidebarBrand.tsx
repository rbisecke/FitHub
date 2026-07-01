"use client";

import { FitHubMark } from "./FitHubMark";

export function SidebarBrand() {
  return (
    <div className="px-3 py-3 select-none">
      {/* Expanded: mark + wordmark */}
      <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
        <FitHubMark size={28} decorative />
        <span className="font-heading text-[26px] text-[var(--text)] tracking-[-0.6px] leading-none">
          FitHub
        </span>
      </div>
      {/* Collapsed: mark only, centered */}
      <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center h-7">
        <FitHubMark size={24} />
      </div>
    </div>
  );
}
