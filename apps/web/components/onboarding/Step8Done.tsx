"use client";

interface Props {
  onFinish: () => void;
}

export function Step5Done({ onFinish }: Props) {
  return (
    <div className="animate-fadeUp flex flex-1 flex-col items-center justify-center text-center">
      {/* Celebration graphic */}
      <div
        className="animate-popIn mb-6 flex h-20 w-20 items-center justify-center rounded-[22px]"
        style={{
          background: "rgba(74,222,128,0.12)",
          border: "1.5px solid var(--accent)",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2
        className="font-heading mb-3 text-[32px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.8px" }}
      >
        You&apos;re all set!
      </h2>

      <p className="mb-4 max-w-[320px] text-[14px] leading-[1.6] text-[var(--muted)]">
        Your fitness repo is initialized. Time to start logging — every workout
        is a <span style={{ color: "var(--accent)" }}>commit</span>.
      </p>

      {/* Terminal summary */}
      <div
        className="font-data mb-10 w-full rounded-xl border p-4 text-left text-[12px] text-[var(--muted)]"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <p>
          <span style={{ color: "var(--accent)" }}>✓</span> Frequency set
        </p>
        <p className="mt-1">
          <span style={{ color: "var(--accent)" }}>✓</span> Units configured
        </p>
        <p className="mt-1">
          <span style={{ color: "var(--accent)" }}>✓</span> Ready to push
        </p>
      </div>

      <button
        onClick={onFinish}
        className="w-full rounded-[13px] py-[15px] text-[15px] font-extrabold transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{ background: "var(--accent)", color: "#0A0D12" }}
      >
        Go to dashboard →
      </button>
    </div>
  );
}
