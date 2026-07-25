import { ArrowRight, PenLine } from "lucide-react";
import { CoachIdentityMark } from "@/components/coach/CoachIdentityMark";
import {
  STARTER_GREETING,
  STARTER_PROMPTS,
  type StarterPrompt,
} from "@/lib/coach/starter-prompts";

/**
 * Empty-state starter prompts (design-spec 03 §8.1). "self-contained" cards
 * send immediately on tap and show a trailing arrow; the "template" card (with
 * an implied blank) populates the composer for editing instead and shows a
 * trailing pencil icon in `--accent` (vs. the muted arrow) — both a distinct
 * shape and a distinct color so the different behavior reads as intentional,
 * legible at a skim, rather than an inconsistency.
 */
export function StarterPrompts({
  onSend,
  onPopulate,
}: {
  onSend: (text: string) => void;
  onPopulate: (text: string) => void;
}) {
  function handleTap(prompt: StarterPrompt) {
    if (prompt.tag === "self-contained") {
      onSend(prompt.text);
    } else {
      onPopulate(prompt.composerValue ?? prompt.text);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="coach-starter-prompts">
      <div className="flex items-center gap-1.5">
        <CoachIdentityMark />
      </div>
      <p className="font-sans text-base text-[var(--text)]">
        {STARTER_GREETING}
      </p>
      <div className="flex flex-col gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => handleTap(prompt)}
            data-testid={`coach-starter-${prompt.id}`}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left font-sans text-[14px] text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: "var(--border)" }}
          >
            <span>{prompt.text}</span>
            {prompt.tag === "self-contained" ? (
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="shrink-0 text-[var(--muted)]"
              />
            ) : (
              <PenLine
                size={16}
                aria-hidden="true"
                className="shrink-0 text-[var(--accent)]"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
