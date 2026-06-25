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

  return (
    <div
      className={cn(
        "rounded-lg border border-[--border] bg-[--surface] p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[--text]">
            Weekly training volume
          </p>
          <p className="text-xs text-[--muted]">Sets × load each week</p>
        </div>
        <PeriodSelector
          options={PERIOD_OPTIONS}
          value={period}
          onChange={handlePeriodChange}
          label="Volume period"
        />
      </div>

      {loading ? (
        <SectionSkeleton lines={0} chartHeight="h-48" />
      ) : (
        <VolumeChart weeks={weeks} />
      )}
    </div>
  );
}
