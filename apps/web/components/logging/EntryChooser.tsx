"use client";

import { SheetOverlay } from "./SheetOverlay";

export type LogEntryMode = "commit" | "quick" | "tag" | "describe";

const OPTIONS: {
  mode: LogEntryMode;
  title: string;
  subtitle: string;
  glyph: string;
  soon?: boolean;
}[] = [
  {
    mode: "commit",
    title: "Commit a workout",
    subtitle: "Full session, multiple movements",
    glyph: "◆",
  },
  {
    mode: "quick",
    title: "Quick log",
    subtitle: "One movement, one result",
    glyph: "＋",
  },
  {
    mode: "tag",
    title: "Tag a milestone",
    subtitle: "A single best-effort attempt",
    glyph: "★",
  },
  // AI natural-language parse (01 §10) ships in the second half of this Effort.
  {
    mode: "describe",
    title: "Describe it",
    subtitle: "Type it out, let AI parse it",
    glyph: "✎",
    soon: true,
  },
];

/**
 * Entry chooser (01 §1). The center create action opens this; on first use
 * (zero lifetime workouts) the app skips it and goes straight to the full form.
 * Four entry points mapping to §2 / §3 / §4 / §10.
 */
export function EntryChooser({
  onChoose,
  onClose,
}: {
  onChoose: (mode: LogEntryMode) => void;
  onClose: () => void;
}) {
  return (
    <SheetOverlay
      title="What are you logging?"
      onClose={onClose}
      maxHeight="60dvh"
    >
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => onChoose(o.mode)}
            disabled={o.soon}
            className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-left disabled:opacity-55"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-data text-[15px]"
              style={{ background: "var(--bg)", color: "var(--accent)" }}
              aria-hidden="true"
            >
              {o.glyph}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className="flex items-center gap-2 font-sans text-[14px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                {o.title}
                {o.soon && (
                  <span
                    className="rounded-[4px] px-1.5 py-0.5 font-data text-[9px] uppercase"
                    style={{ background: "var(--bg)", color: "var(--muted)" }}
                  >
                    soon
                  </span>
                )}
              </span>
              <span
                className="font-sans text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                {o.subtitle}
              </span>
            </span>
          </button>
        ))}
      </div>
    </SheetOverlay>
  );
}
