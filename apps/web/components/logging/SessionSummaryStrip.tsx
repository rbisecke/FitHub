"use client";

import { useEffect, useState } from "react";

/**
 * Session summary strip (01 §2.1, §2.3): live elapsed / volume / set-count,
 * monospace and right-aligned. Elapsed counts from session-open; for a backdated
 * session a live counter is meaningless, so it's omitted (§2.1).
 */
export function SessionSummaryStrip({
  openedAt,
  volumeKg,
  setCount,
  weightUnit,
  backdated,
}: {
  openedAt: number;
  volumeKg: number;
  setCount: number;
  weightUnit: string;
  backdated: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (backdated) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [backdated]);

  const elapsedS = Math.max(0, Math.floor((now - openedAt) / 1000));
  const mm = String(Math.floor(elapsedS / 60)).padStart(2, "0");
  const ss = String(elapsedS % 60).padStart(2, "0");

  const cell = (label: string, value: string) => (
    <div className="flex flex-col items-start">
      <span
        className="font-data text-[10px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular-nums text-[16px]"
        style={{ color: "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="flex items-center justify-between rounded-[8px] px-4 py-2.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      data-testid="summary-strip"
    >
      {!backdated && cell("Elapsed", `${mm}:${ss}`)}
      {cell("Volume", `${Math.round(volumeKg)} ${weightUnit}`)}
      {cell("Sets", String(setCount))}
    </div>
  );
}
