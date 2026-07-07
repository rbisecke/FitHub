"use client";

import { useState, useCallback } from "react";
import { formatWeight } from "@/lib/display";

interface Props {
  /** Where the calculator is rendered. 'inline': embedded in detail page (collapsible on mobile).
   *  'sheet': rendered inside a bottom sheet provided by the parent. */
  mode: "inline" | "sheet";
  /** All-time best e1RM — the "actual best" basis. */
  bestKg: number;
  /** OLS regression estimate for today — the "est. today" basis. Null if <3 data points. */
  currentKg?: number | null;
  /** If true, default the basis to "est. today" (data is old). */
  isStale?: boolean;
  /** Starting percentage (50–100). Defaults to 80. */
  initialPct?: number;
  /** User's weight unit preference: 'kg' (default) or 'lb'. */
  weightUnit?: string;
}

function roundMetricKg(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

function kgToLb(kg: number): number {
  return kg * 2.20462;
}

function roundImperialLb(lb: number): number {
  const step = lb > 45 ? 5 : 2.5;
  return Math.round(lb / step) * step;
}

export function LoadCalculator({
  mode,
  bestKg,
  currentKg,
  isStale = false,
  initialPct = 80,
  weightUnit = "kg",
}: Props) {
  const [basis, setBasis] = useState<"actual" | "current">(
    isStale && currentKg != null ? "current" : "actual",
  );
  const [pct, setPct] = useState(initialPct);
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);

  const hasCurrent = currentKg != null;
  const basisKg = basis === "current" && hasCurrent ? currentKg : bestKg;
  const targetKg = (pct / 100) * basisKg;
  const roundedKg = roundMetricKg(targetKg);
  const isImperial = weightUnit === "lb";
  const targetLb = kgToLb(targetKg);
  const roundedLb = roundImperialLb(targetLb);

  const displayWeight = isImperial
    ? `${targetLb.toFixed(0)} lb`
    : `${targetKg.toFixed(1)} kg`;

  const plateSizeLabel = targetLb > 45 ? "5" : "2.5";
  const displayRounded = isImperial
    ? `≈ ${roundedLb.toFixed(0)} lb (nearest ${plateSizeLabel} lb)`
    : `≈ ${roundedKg.toFixed(1)} kg (nearest 2.5 kg)`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        isImperial ? `${targetLb.toFixed(0)} lb` : `${targetKg.toFixed(1)} kg`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context) — silently ignore
    }
  }, [isImperial, targetKg, targetLb]);

  // Progress percentage for the slider track fill
  const sliderPct = ((pct - 50) / 50) * 100;

  const calculatorBody = (
    <div className="space-y-[14px]" data-testid="calculator-body">
      {/* Basis toggle — only when regression estimate is available */}
      {hasCurrent && (
        <div
          className="flex gap-[2px] rounded-[8px] p-[2px]"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          role="group"
          aria-label="Calculation basis"
        >
          {(["actual", "current"] as const).map((b) => {
            const isActive = basis === b;
            return (
              <button
                key={b}
                onClick={() => setBasis(b)}
                aria-pressed={isActive}
                className="flex-1 font-data py-[5px] rounded-[6px] transition-colors"
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : undefined,
                  color: isActive ? "var(--text)" : "var(--muted)",
                  background: isActive ? "var(--surface)" : "transparent",
                  border: isActive
                    ? "1px solid var(--border)"
                    : "1px solid transparent",
                }}
              >
                {b === "actual" ? "actual best" : "est. today"}
              </button>
            );
          })}
        </div>
      )}

      {/* Base weight display */}
      <div className="flex items-baseline gap-[6px] px-[2px]">
        <span
          className="font-data text-[10px]"
          style={{ color: "var(--muted)" }}
        >
          base
        </span>
        <span
          className="font-mono tabular-nums text-[13px]"
          style={{ color: "var(--text)" }}
        >
          {formatWeight(basisKg, isImperial ? "lb" : "kg")}
        </span>
        {isStale && basis === "current" && (
          <span
            className="font-data text-[9px]"
            style={{ color: "var(--amber)" }}
          >
            (estimate may be outdated)
          </span>
        )}
      </div>

      {/* Percentage slider */}
      <div>
        <div className="flex items-center justify-between mb-[8px]">
          <span
            className="font-data text-[10px]"
            style={{ color: "var(--muted)" }}
          >
            percentage
          </span>
          <span
            className="font-mono tabular-nums font-semibold text-[13px]"
            style={{ color: "var(--amber)" }}
            data-testid="pct-display"
          >
            {pct}%
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full h-[4px] rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--amber) ${sliderPct}%, var(--border) ${sliderPct}%)`,
            accentColor: "var(--amber)",
          }}
          aria-label={`Percentage of 1RM: ${pct}%`}
          data-testid="pct-slider"
        />
        <div className="flex justify-between mt-[4px]">
          <span
            className="font-data text-[9px]"
            style={{ color: "var(--muted)" }}
          >
            50%
          </span>
          <span
            className="font-data text-[9px]"
            style={{ color: "var(--muted)" }}
          >
            100%
          </span>
        </div>
      </div>

      {/* Computed output */}
      <div
        className="rounded-[10px] p-[14px]"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between gap-[12px]">
          <span
            className="font-mono tabular-nums font-semibold"
            style={{ fontSize: 24, color: "var(--blue)" }}
            data-testid="computed-weight"
          >
            {displayWeight}
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy weight to clipboard"
            className="font-data text-[10px] px-[8px] py-[4px] rounded-[6px] transition-colors flex-shrink-0"
            style={{
              color: copied ? "var(--accent)" : "var(--muted)",
              border: `1px solid ${copied ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {copied ? "copied!" : "copy"}
          </button>
        </div>
        <p
          className="font-mono text-[11px] mt-[4px]"
          style={{ color: "var(--muted)" }}
        >
          {displayRounded}
        </p>
        {isImperial && (
          <p
            className="font-mono text-[11px] mt-[2px]"
            style={{ color: "var(--muted)" }}
          >
            {`${targetKg.toFixed(1)} kg`}
          </p>
        )}
      </div>
    </div>
  );

  if (mode === "sheet") {
    // In sheet mode the parent provides the container — just render the body
    return calculatorBody;
  }

  // Inline mode: always visible on desktop; collapsible on mobile
  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
      data-testid="load-calculator"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-[14px]"
        aria-expanded={!collapsed}
        style={{ background: "transparent", cursor: "pointer" }}
      >
        <span
          className="font-mono text-[12px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          $ load calculator
        </span>
        {/* Chevron — only meaningful on mobile; on desktop the body is always shown */}
        <svg
          className="md:hidden"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            color: "var(--muted)",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 200ms",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Body: collapsed on mobile by default; always shown on desktop */}
      <div
        className={`px-[14px] pb-[14px] ${
          collapsed ? "hidden md:block" : "block"
        }`}
      >
        {calculatorBody}
      </div>
    </div>
  );
}
