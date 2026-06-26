"use client";

import { FitHubMark } from "./FitHubMark";

export function SidebarBrand() {
  return (
    <div className="px-3 py-3 select-none">
      {/* Expanded: mark + wordmark + tagline */}
      <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
        <FitHubMark size={28} decorative />
        <div>
          <p className="font-mono text-[10px] text-[var(--muted)] leading-tight">
            $ git commit --fit
          </p>
          <p className="text-base font-bold text-[var(--text)] leading-tight">
            FitHub
          </p>
        </div>
      </div>
      {/* Collapsed: mark only, centered */}
      <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center h-7">
        <FitHubMark size={24} />
      </div>
    </div>
  );
}
