import Link from "next/link";

/**
 * Shared in-band retryable-error block (design-spec 03 §9.3) — monochrome-
 * leaning, replaces any partial stream, single shared Retry control. Used for
 * every technical failure the backend doesn't further distinguish today (LLM
 * timeout / unreachable / invalid-output / generic all currently return the
 * same message server-side — this renders whatever text the backend actually
 * sent rather than inventing more specific copy it can't back).
 */
export function ChatErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      data-testid="coach-error-banner"
      className="flex flex-col gap-2 rounded-lg border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-sans text-sm text-[var(--text)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="coach-retry-button"
        className="min-h-9 w-fit rounded-md border px-3 py-1.5 font-sans text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        Retry
      </button>
    </div>
  );
}

/** Per-user rate limit (design-spec 03 §9.3 last row) — distinct framing, not
 * a server-error framing, detected via HTTP 429 on the initial POST. */
export function RateLimitedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      data-testid="coach-rate-limit-notice"
      className="flex flex-col gap-2 rounded-lg border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-sans text-sm text-[var(--muted)]">
        You&apos;re sending messages quickly — wait a moment.
      </p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="coach-retry-button"
        className="min-h-9 w-fit rounded-md border px-3 py-1.5 font-sans text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        Retry
      </button>
    </div>
  );
}

/** Kill-switch (design-spec 03 §9.1) — `LLM_ENABLED=false`, a calm persistent
 * banner, composer disabled. Names that the deterministic injury-safety tools
 * still work rather than framing the whole surface as broken. */
export function KillSwitchBanner() {
  return (
    <div
      role="status"
      data-testid="coach-kill-switch-banner"
      className="flex flex-col gap-2 rounded-lg p-4"
      style={{
        background: "color-mix(in srgb, var(--muted) 12%, var(--bg))",
        border: "1px solid var(--border)",
      }}
    >
      <p className="font-sans text-sm font-medium text-[var(--text)]">
        AI coaching is temporarily suspended. Please try again later.
      </p>
      <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
        The WOD safety checker still works while chat is suspended.
      </p>
      <Link
        href="/coach/check-wod"
        className="w-fit font-sans text-[13px] underline"
        style={{ color: "var(--accent)" }}
      >
        Open the WOD safety checker →
      </Link>
    </div>
  );
}
