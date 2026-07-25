import ReactMarkdown from "react-markdown";
import { CoachIdentityMark } from "@/components/coach/CoachIdentityMark";
import { ProgressTicker } from "@/components/coach/ProgressTicker";
import {
  CitationsRow,
  CitationsSkeleton,
} from "@/components/coach/CitationsRow";
import { FollowUpChips } from "@/components/coach/FollowUpChips";
import type { ChatCitation } from "@/hooks/use-chat-stream";
import type { FollowUpChip } from "@/lib/coach/follow-up-chips";
import { formatMessageTime } from "@/lib/coach/format-message-time";

export type AssistantPhase = "thinking" | "streaming" | "settled";

/**
 * One assistant turn (design-spec 03 §1, §2, §4, §13) — the flush, left-aligned
 * block led by the reserved AI-identity mark (§0.2). Handles all three
 * streaming-lifecycle phases (§2) plus the settled-turn extras: citations
 * (§4), the MODIFY-tier caution tint (§13, milder than STOP — never confused
 * with it), the stub tag (§9.2), and post-answer follow-up chips (§8.2).
 */
export function AssistantMessage({
  phase,
  text,
  citations = [],
  safetyTier = null,
  stub = false,
  followUpChips = [],
  onSelectChip,
  createdAt,
}: {
  phase: AssistantPhase;
  text: string;
  citations?: ChatCitation[];
  safetyTier?: "coach" | "modify" | null;
  stub?: boolean;
  followUpChips?: (FollowUpChip & { href?: string })[];
  onSelectChip?: (label: string) => void;
  /** ISO timestamp, when known — omitted while a turn hasn't settled yet. */
  createdAt?: string;
}) {
  const isModify = safetyTier === "modify";

  return (
    <div
      data-testid="coach-assistant-turn"
      data-safety-tier={safetyTier ?? undefined}
      className="flex flex-col gap-2 rounded-lg p-2"
      style={
        isModify
          ? {
              background: "color-mix(in srgb, var(--amber) 8%, var(--bg))",
              border:
                "1px solid color-mix(in srgb, var(--amber) 30%, var(--border))",
            }
          : undefined
      }
    >
      {stub && (
        <span
          className="w-fit rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          data-testid="coach-stub-tag"
        >
          Stub — not a real coach
        </span>
      )}

      {isModify && (
        <span
          className="w-fit font-mono text-[10px] tracking-wide uppercase"
          style={{ color: "var(--amber)" }}
          data-testid="coach-modify-tier-flag"
        >
          Touches on an injury or health concern
        </span>
      )}

      {phase === "thinking" ? (
        <ProgressTicker phase="thinking" />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <CoachIdentityMark />
            {phase === "settled" && createdAt && (
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{ color: "var(--muted)" }}
                data-testid="coach-assistant-turn-time"
              >
                {formatMessageTime(createdAt)}
              </span>
            )}
          </div>
          {phase === "streaming" ? (
            <p
              className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--text)]"
              data-testid="coach-streaming-text"
            >
              {text}
              <span
                aria-hidden="true"
                className="animate-blink ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 align-middle"
                style={{ background: "var(--muted)" }}
              />
            </p>
          ) : (
            <div
              className="font-sans text-[15px] leading-relaxed text-[var(--text)] [&_code]:rounded [&_code]:bg-[var(--surface)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_ol]:list-decimal [&_ol]:pl-5 [&_p:last-child]:mb-0 [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
              data-testid="coach-settled-text"
            >
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          )}
        </>
      )}

      {phase === "settled" && <ProgressTicker phase="settled" />}

      {phase === "streaming" && <CitationsSkeleton />}
      {phase === "settled" && <CitationsRow citations={citations} />}

      {phase === "settled" && followUpChips.length > 0 && onSelectChip && (
        // Extra top margin beyond the parent's gap-2 — otherwise this reads
        // as one more entry inside "Sources" rather than a distinct
        // next-action affordance below it (design-review finding).
        <div className="mt-2">
          <FollowUpChips chips={followUpChips} onSelect={onSelectChip} />
        </div>
      )}
    </div>
  );
}
