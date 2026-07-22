"use client";

import { useState } from "react";
import type { ChatCitation } from "@/hooks/use-chat-stream";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_VISIBLE = 3;

/**
 * "Consulting knowledge base…" skeleton — shown in the citation slot only
 * while streaming (design-spec 03 §2, §4). Never progressive/mid-stream; swaps
 * to real cards on `done`.
 */
export function CitationsSkeleton() {
  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="coach-citations-skeleton"
    >
      <p className="font-mono text-[11px] text-[var(--muted)]">
        Consulting knowledge base…
      </p>
      <div className="flex gap-2">
        <Skeleton className="h-14 w-32 rounded-lg" />
        <Skeleton className="h-14 w-32 rounded-lg" />
        <Skeleton className="h-14 w-32 rounded-lg" />
      </div>
    </div>
  );
}

function CitationDetailBody({ citation }: { citation: ChatCitation }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-sm text-[var(--text)]">{citation.title}</p>
      <span
        className="w-fit rounded-full border px-2 py-0.5 font-sans text-[11px] text-[var(--muted)]"
        style={{ borderColor: "var(--border)" }}
      >
        {citation.source_type}
      </span>
      {/* No excerpt/URL field exists on Citation today (§4) — that row is
          reserved for if/when the backend adds one; nothing is fabricated here. */}
    </div>
  );
}

const cardClassName =
  "flex w-40 shrink-0 flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors hover:bg-[var(--surface)]";

/** Desktop: each card is its own independently-anchored Popover — no shared
 * "which index is open" state needed. */
function DesktopCitationCard({ citation }: { citation: ChatCitation }) {
  return (
    <Popover>
      <PopoverTrigger
        data-testid="coach-citation-card"
        className={cardClassName}
        style={{ borderColor: "var(--border)" }}
      >
        <span className="line-clamp-2 font-sans text-[12px] leading-snug text-[var(--text)]">
          {citation.title}
        </span>
        <span
          className="rounded-full border px-1.5 py-0.5 font-sans text-[10px] text-[var(--muted)]"
          style={{ borderColor: "var(--border)" }}
        >
          {citation.source_type}
        </span>
      </PopoverTrigger>
      <PopoverContent>
        <CitationDetailBody citation={citation} />
      </PopoverContent>
    </Popover>
  );
}

/** Mobile: a plain button; the parent owns one shared bottom Sheet instance. */
function MobileCitationCard({
  citation,
  onOpen,
}: {
  citation: ChatCitation;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="coach-citation-card"
      className={cardClassName}
      style={{ borderColor: "var(--border)" }}
    >
      <span className="line-clamp-2 font-sans text-[12px] leading-snug text-[var(--text)]">
        {citation.title}
      </span>
      <span
        className="rounded-full border px-1.5 py-0.5 font-sans text-[10px] text-[var(--muted)]"
        style={{ borderColor: "var(--border)" }}
      >
        {citation.source_type}
      </span>
    </button>
  );
}

/**
 * Compact citation card row (design-spec 03 §4) — "Sources," sorted by `score`
 * descending, `score` itself never rendered. 3-4 visible + "+N more" expand in
 * place. The whole row collapses when there are no citations (no hedge message).
 */
export function CitationsRow({ citations }: { citations: ChatCitation[] }) {
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();

  if (citations.length === 0) return null;

  const sorted = [...citations].sort((a, b) => b.score - a.score);
  const visible = expanded ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const remaining = sorted.length - visible.length;
  const activeCitation = openIndex !== null ? sorted[openIndex] : undefined;

  return (
    <div className="flex flex-col gap-1.5" data-testid="coach-citations-row">
      <p className="font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase">
        Sources
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map((c, i) =>
          isMobile ? (
            <MobileCitationCard
              key={`${c.title}-${c.source_type}-${i}`}
              citation={c}
              onOpen={() => setOpenIndex(i)}
            />
          ) : (
            <DesktopCitationCard
              key={`${c.title}-${c.source_type}-${i}`}
              citation={c}
            />
          ),
        )}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-24 shrink-0 items-center justify-center rounded-lg border font-sans text-[12px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            style={{ borderColor: "var(--border)" }}
          >
            +{remaining} more
          </button>
        )}
      </div>

      {isMobile && (
        <Sheet
          open={activeCitation !== undefined}
          onOpenChange={(open) => !open && setOpenIndex(null)}
        >
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Source</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              {activeCitation && (
                <CitationDetailBody citation={activeCitation} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
