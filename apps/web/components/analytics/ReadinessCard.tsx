"use client";

import Link from "next/link";
import type { ReadinessResponse } from "@/lib/api";

interface Props {
  data: ReadinessResponse;
  acwr?: number | null;
}

const LABEL_CONFIG: Record<string, { text: string; color: string }> = {
  optimal: { text: "Optimal", color: "var(--accent)" },
  fresh: { text: "Fresh", color: "var(--accent)" },
  high_load: { text: "High Load", color: "var(--amber)" },
  fatigued: { text: "Fatigued", color: "var(--red)" },
  insufficient_data: { text: "Insufficient Data", color: "var(--muted)" },
};

const TIER_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    color: string;
    borderColor: string;
    title: string;
  }
> = {
  standard: {
    label: "28d baseline",
    bg: "rgba(63,185,80,0.12)",
    color: "var(--green)",
    borderColor: "rgba(63,185,80,0.3)",
    title: "28+ days of HRV data — full confidence",
  },
  low_14_28: {
    label: "14–28d baseline",
    bg: "rgba(210,153,34,0.12)",
    color: "var(--amber)",
    borderColor: "rgba(210,153,34,0.3)",
    title: "14–28 days of HRV data — building confidence",
  },
  calibrating_14d: {
    label: "Calibrating",
    bg: "rgba(139,148,158,0.12)",
    color: "var(--muted)",
    borderColor: "var(--border)",
    title: "Less than 14 days of HRV data — still calibrating",
  },
};

function ConfidenceTierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG["calibrating_14d"]!;
  return (
    <span
      title={cfg.title}
      className="rounded border px-1.5 py-0.5 font-mono text-[10px]"
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderColor: cfg.borderColor,
      }}
    >
      {cfg.label}
    </span>
  );
}

function CoverageBar({ coverage }: { coverage: number }) {
  const pct = Math.round(coverage * 100);
  return (
    <div className="mt-2">
      <div
        className="mb-0.5 flex justify-between font-mono text-[10px]"
        style={{ color: "var(--muted)" }}
      >
        <span>Signal coverage</span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: "var(--blue)" }}
        />
      </div>
    </div>
  );
}

function strainColor(score: number): string {
  if (score < 40) return "var(--accent)";
  if (score <= 70) return "var(--amber)";
  return "var(--red)";
}

function StrainPips({ score }: { score: number }) {
  // 5 segments: each represents a 20% tier
  const filled = Math.min(5, Math.ceil(score / 20));
  const color = strainColor(score);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="h-[6px] w-[10px] rounded-[2px]"
          style={{
            background: i < filled ? color : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

export function ReadinessCard({ data, acwr }: Props) {
  const strainScore = data.strain_score ?? null;
  const cfg = LABEL_CONFIG[data.label] ?? LABEL_CONFIG["insufficient_data"]!;
  const pct = Math.round(data.score * 100);

  const hasWearable =
    data.recovery_score != null &&
    data.coverage != null &&
    data.confidence_tier != null;

  const hrvLabel =
    data.hrv_type === "hrv_sdnn"
      ? "HRV (SDNN)"
      : data.hrv_type === "hrv_rmssd"
        ? "HRV (RMSSD)"
        : "HRV";

  return (
    <div
      data-testid="readiness-card"
      className="w-full rounded-2xl border p-5"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-baseline justify-between">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.5px]"
          style={{ color: "var(--muted)" }}
        >
          Readiness
        </p>
        <span
          className="font-mono text-[12px] font-semibold"
          style={{ color: cfg.color }}
        >
          {cfg.text}
        </span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-4 mb-2">
        <p
          className="font-heading text-[32px] leading-none"
          style={{ color: "var(--text)" }}
        >
          {pct}%
        </p>
        <div className="flex-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: cfg.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footnote */}
      <p className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
        {acwr != null
          ? `Driven by ACWR ${acwr.toFixed(2)} and recent load`
          : "Based on recent training load"}
        {data.sleep_avg != null
          ? ` · Sleep ${data.sleep_avg.toFixed(1)}/7`
          : ""}
      </p>

      {/* No-wearable link */}
      {!hasWearable && (
        <Link
          href="/integrations"
          className="mt-2 flex items-center gap-1 font-mono text-[10px] transition-opacity hover:opacity-70"
          style={{ color: "var(--blue)" }}
        >
          Connect Apple Health to improve accuracy →
        </Link>
      )}

      {/* Wearable section */}
      {hasWearable && (
        <div
          className="mt-3 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span
              className="font-mono text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              {hrvLabel} recovery
            </span>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[13px]"
                style={{ color: "var(--text)" }}
              >
                {Math.round((data.recovery_score ?? 0) * 100)}%
              </span>
              <ConfidenceTierBadge tier={data.confidence_tier!} />
            </div>
          </div>
          <CoverageBar coverage={data.coverage ?? 0} />
        </div>
      )}

      {/* Strain row */}
      <div
        className="mt-3 border-t pt-3"
        style={{ borderColor: "var(--border)" }}
      >
        {strainScore != null ? (
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.4px]"
              style={{ color: "var(--muted)" }}
            >
              Yesterday&apos;s strain
            </span>
            <div className="flex items-center gap-2">
              <StrainPips score={strainScore} />
              <span
                className="font-mono text-[13px] font-semibold"
                style={{ color: strainColor(strainScore) }}
              >
                {Math.round(strainScore)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.4px]"
              style={{ color: "var(--muted)" }}
            >
              Yesterday&apos;s strain
            </span>
            <Link
              href="/integrations"
              className="font-mono text-[10px] transition-opacity hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              no wearable data →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
