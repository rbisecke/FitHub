"use client";

interface Props {
  viewMode: "current" | "timeline";
  onToggle: (mode: "current" | "timeline") => void;
}

export function RecordsHeader({ viewMode, onToggle }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-mono text-xs text-[--muted] mb-1">$ git tag</p>
        <h1 className="text-2xl font-bold text-[--text]">Personal Records</h1>
      </div>

      <div
        role="group"
        aria-label="View mode"
        className="hidden md:flex rounded border border-[--border] overflow-hidden shrink-0 mt-1"
      >
        {(["current", "timeline"] as const).map((mode) => (
          <button
            key={mode}
            aria-pressed={viewMode === mode}
            onClick={() => onToggle(mode)}
            className={`px-3 py-1 font-mono text-[11px] capitalize transition-colors ${
              viewMode === mode
                ? "bg-[#21262d] text-[--text]"
                : "text-[--muted] hover:text-[--text]"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
