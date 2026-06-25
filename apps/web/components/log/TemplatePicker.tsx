"use client";

import type { WorkoutSummary } from "@/lib/api";

function formatTemplateDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TemplatePickerProps {
  recentWorkouts: WorkoutSummary[];
  onSelect: (w: WorkoutSummary) => void;
}

export function TemplatePicker({
  recentWorkouts,
  onSelect,
}: TemplatePickerProps) {
  if (recentWorkouts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-[#8b949e]">Or start from a recent session</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-0">
        {recentWorkouts.map((w) => {
          const label =
            w.title ??
            (w.session_type
              ? w.session_type.replace(/_/g, " ")
              : `${w.result_count} movement${w.result_count !== 1 ? "s" : ""}`);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w)}
              className="min-w-[140px] flex-shrink-0 rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-left hover:border-[#58a6ff]/60 hover:bg-[#161b22]/80 transition-colors"
            >
              <p className="font-mono text-xs text-[#8b949e]">
                {formatTemplateDate(w.performed_at)}
              </p>
              <p className="mt-1 text-sm text-[#e6edf3] line-clamp-2 capitalize">
                {label}
              </p>
              {w.result_count > 0 && (
                <p className="mt-1 font-mono text-xs text-[#8b949e]">
                  {w.result_count} movement{w.result_count !== 1 ? "s" : ""}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
