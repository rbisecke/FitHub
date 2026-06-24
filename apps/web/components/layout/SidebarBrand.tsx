"use client";

export function SidebarBrand() {
  return (
    <div className="px-3 py-3 select-none">
      {/* Expanded: wordmark + tagline */}
      <div className="group-data-[collapsible=icon]:hidden">
        <p className="font-mono text-[10px] text-[var(--muted)]">
          $ git commit --fit
        </p>
        <p className="text-base font-bold text-[var(--text)]">FitHub</p>
      </div>
      {/* Collapsed: single initial, centered */}
      <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center h-7">
        <span className="font-bold text-[var(--text)] text-sm">F</span>
      </div>
    </div>
  );
}
