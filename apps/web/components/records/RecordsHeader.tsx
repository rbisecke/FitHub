"use client";

import { PageHeader } from "@/components/ui/page-header";

interface Props {
  viewMode: "current" | "timeline";
  onToggle: (mode: "current" | "timeline") => void;
  totalCount: number;
}

export function RecordsHeader({ viewMode, onToggle, totalCount }: Props) {
  const sub =
    totalCount === 0
      ? "No records yet — log your first weighted result to start tagging."
      : `${totalCount} tagged release${
          totalCount !== 1 ? "s" : ""
        } — your all-time bests across every category.`;

  return (
    <PageHeader
      gitCommand="$ git tag --list 'pr/*'"
      title="Records"
      sub={sub}
      action={
        <div
          role="group"
          aria-label="View mode"
          className="flex rounded-[10px] bg-[var(--card)] border border-[var(--border)] p-[3px] gap-[2px] shrink-0"
        >
          {(["current", "timeline"] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={viewMode === mode}
              onClick={() => onToggle(mode)}
              className={`px-3 py-1.5 text-[12px] font-semibold capitalize rounded-lg transition-colors min-h-[30px] ${
                viewMode === mode
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {mode === "current" ? "Current records" : "Timeline"}
            </button>
          ))}
        </div>
      }
    />
  );
}
