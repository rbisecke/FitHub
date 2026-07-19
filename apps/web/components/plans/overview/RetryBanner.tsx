/**
 * Calm inline retry banner for a failed fetch (02 §4, §5, §6, §8.7) —
 * distinct from an empty-but-successful state, which is never an error.
 */
export function RetryBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
      style={{
        background: "color-mix(in srgb, var(--red) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--red) 35%, transparent)",
      }}
    >
      <span className="font-sans text-sm text-[var(--red)]">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded font-mono text-xs font-semibold"
        style={{
          border: "1px solid var(--red)",
          color: "var(--red)",
          background: "transparent",
          padding: "8px 14px",
          minHeight: "44px",
          cursor: "pointer",
        }}
      >
        retry
      </button>
    </div>
  );
}
