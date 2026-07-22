"use client";

import { useState } from "react";

/**
 * Notes block (06 §3, Data displayed) — collapsed by default with a
 * single-line CSS ellipsis truncation and a "Show more" affordance. Always
 * starts collapsed on every visit; no remembered expanded state.
 */
export function NotesBlock({ notes }: { notes: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!notes) return null;

  return (
    <div className="flex flex-col gap-1">
      <h2
        className="font-sans text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        Notes
      </h2>
      <p
        className={
          expanded ? "font-sans text-[13px]" : "truncate font-sans text-[13px]"
        }
        style={{ color: "var(--text)" }}
      >
        {notes}
      </p>
      {!expanded && notes.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-fit font-sans text-[12px] font-medium"
          style={{ color: "var(--accent)" }}
        >
          Show more
        </button>
      )}
    </div>
  );
}
