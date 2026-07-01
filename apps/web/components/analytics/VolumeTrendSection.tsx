"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { WeeklyVolume } from "@/lib/api";
import { VolumeChart } from "@/components/analytics/VolumeChart";
import {
  PeriodSelector,
  type PeriodOption,
} from "@/components/analytics/PeriodSelector";
import { SectionSkeleton } from "@/components/analytics/SectionSkeleton";

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Last 8 weeks", value: "8" },
  { label: "Last 12 weeks", value: "12" },
];

const STORAGE_KEY = "progress.volume.period";
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  initialWeeks: WeeklyVolume[];
  token: string;
  className?: string;
}

export function VolumeTrendSection({ initialWeeks, token, className }: Props) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const [period, setPeriod] = useState(() => {
    if (typeof window === "undefined") return "8";
    return localStorage.getItem(STORAGE_KEY) ?? "8";
  });
  const [loading, setLoading] = useState(false);

  const fetchVolume = useCallback(
    async (p: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `${BASE}/api/v1/analytics/volume-trend?weeks=${p}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error("volume-trend fetch failed");
        const data = await res.json();
        setWeeks(data.weeks ?? []);
      } catch {
        // keep existing data on error
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    localStorage.setItem(STORAGE_KEY, value);
    void fetchVolume(value);
  };

  const weekStarts = [...new Set(weeks.map((w) => w.week_start))].sort();
  const latestWeekStart = weekStarts[weekStarts.length - 1];
  const prevWeekStart = weekStarts[weekStarts.length - 2];
  const latestTotal = weeks
    .filter((w) => w.week_start === latestWeekStart)
    .reduce((s, w) => s + w.total_load, 0);
  const prevTotal = weeks
    .filter((w) => w.week_start === prevWeekStart)
    .reduce((s, w) => s + w.total_load, 0);
  const deltaLoad = latestTotal - prevTotal;
  const deltaText =
    deltaLoad >= 0 ? `+${Math.round(deltaLoad)}` : `${Math.round(deltaLoad)}`;

  return (
    <div
      className={cn(
        "bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[15px] space-y-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-bold text-[var(--foreground)]">
            Volume trend
          </p>
          <p className="text-[10.5px] text-[var(--muted-foreground)] mt-[1px]">
            Total weight moved per week
          </p>
        </div>
        <div className="flex items-start gap-2">
          {latestTotal > 0 && (
            <div className="text-right md:hidden">
              <div className="font-heading text-[18px] leading-none">
                {Math.round(latestTotal).toLocaleString()}
              </div>
              <div
                className="font-data text-[10px] font-semibold mt-[2px]"
                style={{
                  color: deltaLoad >= 0 ? "var(--accent)" : "var(--hot)",
                }}
              >
                {deltaText}
              </div>
            </div>
          )}
          <div className="hidden md:block">
            <PeriodSelector
              options={PERIOD_OPTIONS}
              value={period}
              onChange={handlePeriodChange}
              label="Volume period"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <SectionSkeleton lines={0} chartHeight="h-48" />
      ) : (
        <VolumeChart weeks={weeks} />
      )}
    </div>
  );
}
