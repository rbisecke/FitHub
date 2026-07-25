import Link from "next/link";
import type { FollowUpChip } from "@/lib/coach/follow-up-chips";

/**
 * Post-answer follow-up chips (design-spec 03 §8.2). Deterministic
 * keyword-matched chips send a new question immediately (same conditional
 * behavior as starter prompts — every bank entry is a complete, self-contained
 * question). A MODIFY-tier chip instead carries an `href` and deep-links to
 * the relevant utility rather than sending another chat turn (FR §7's
 * chat-talks / button-acts split) — suppressed entirely after STOP (§8.2).
 */
export function FollowUpChips({
  chips,
  onSelect,
}: {
  chips: (FollowUpChip & { href?: string })[];
  onSelect: (label: string) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="coach-follow-up-chips">
      {chips.map((chip) =>
        chip.href ? (
          <Link
            key={chip.id}
            href={chip.href}
            className="inline-flex min-h-11 items-center rounded-full border px-3 font-sans text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: "var(--border)" }}
          >
            {chip.label}
          </Link>
        ) : (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelect(chip.label)}
            className="inline-flex min-h-11 items-center rounded-full border px-3 font-sans text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: "var(--border)" }}
          >
            {chip.label}
          </button>
        ),
      )}
    </div>
  );
}
