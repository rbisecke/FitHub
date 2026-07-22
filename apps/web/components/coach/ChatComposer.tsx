"use client";

import { ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const MAX_CHARS = 2000;
const COUNTER_THRESHOLD = 200;

/**
 * Persistent composer (design-spec 03 §1): "Ask your coach…" placeholder,
 * 1-2000 char cap (FR §3) with a counter that appears only as the cap
 * approaches, locked while a response is streaming — no queuing. Sits above
 * the safe-area inset on mobile via `sticky bottom-0` within the scrolling
 * thread container.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const remaining = MAX_CHARS - value.length;
  const showCounter = remaining <= COUNTER_THRESHOLD;
  const canSend = !disabled && value.trim().length > 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div
      // Extra bottom clearance on mobile only: the global quick-log FAB
      // (components/shell/quick-log-fab.tsx) floats just above the bottom
      // tab bar and otherwise overlaps this composer's bottom edge on the
      // stacked mobile thread view (it doesn't collide on desktop, where
      // there's no bottom tab bar/FAB at all).
      className="sticky bottom-0 flex flex-col gap-1 border-t bg-[var(--bg)] px-4 pt-3 pb-6 md:pb-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach…"
          disabled={disabled}
          maxLength={MAX_CHARS}
          rows={1}
          data-testid="coach-composer-input"
          aria-label="Message your coach"
          className="max-h-40 min-h-11 resize-none bg-[var(--surface)] text-[var(--text)]"
        />
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          data-testid="coach-composer-send"
          className="min-h-11 min-w-11"
        >
          <ArrowUp size={16} aria-hidden="true" />
        </Button>
      </div>
      {showCounter && (
        <p
          className="text-right font-mono text-[11px] tabular-nums"
          style={{ color: "var(--muted)" }}
          data-testid="coach-composer-counter"
        >
          {value.length}/{MAX_CHARS}
        </p>
      )}
    </div>
  );
}
