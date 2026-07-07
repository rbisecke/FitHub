"use client";

import { useState, useEffect, useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { tooltipContentStyle } from "@/lib/chart-utils";
import type { PersonalRecord, E1RMPoint, Movement } from "@/lib/api";
import {
  PeriodSelector,
  type PeriodOption,
} from "@/components/analytics/PeriodSelector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "All", value: "all" },
];

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function filterByPeriod(points: E1RMPoint[], period: string): E1RMPoint[] {
  if (period === "all") return points;
  const days = period === "3M" ? 90 : 180;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return points.filter((p) => new Date(p.day + "T00:00:00") >= cutoff);
}

function fmtChartDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface Props {
  personalRecords: PersonalRecord[];
  token: string;
  weightUnit?: string;
  className?: string;
}

export function MobileStrengthTrendCard({
  personalRecords,
  token,
  weightUnit = "kg",
  className,
}: Props) {
  const isImperial = weightUnit === "lb";
  const prefersReducedMotion = useReducedMotion();
  const topPR = personalRecords[0] ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(
    topPR?.movement_id ?? null,
  );
  const [selectedName, setSelectedName] = useState<string>(
    topPR?.movement_name ?? "",
  );
  const [period, setPeriod] = useState("3M");
  const [trendPoints, setTrendPoints] = useState<E1RMPoint[]>([]);
  // Track which movement ID has been loaded so loading state can be derived
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movement[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch all-time trend data for the selected movement; filter by period client-side.
  // Loading state is derived from selectedId !== loadedForId — avoids synchronous setState in effect.
  useEffect(() => {
    if (!selectedId) return;
    fetch(`${BASE}/api/v1/analytics/movement-trend/${selectedId}?days=730`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<E1RMPoint[]>;
      })
      .then((pts) => {
        setTrendPoints(pts);
        setLoadedForId(selectedId);
      })
      .catch(() => {
        setTrendPoints([]);
        setLoadedForId(selectedId);
      });
  }, [selectedId, token]);

  // Movement search — results are cleared via the derived displayResults below
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const controller = new AbortController();
    fetch(`${BASE}/api/v1/movements?q=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<Movement[]>)
      .then((data) => setSearchResults(data))
      .catch(() => {});
    return () => controller.abort();
  }, [searchQuery, token]);

  const filteredPoints = useMemo(
    () => (trendPoints ? filterByPeriod(trendPoints, period) : []),
    [trendPoints, period],
  );

  const chartData = useMemo(
    () =>
      filteredPoints.map((pt) => ({
        day: pt.day,
        e1rm: isImperial
          ? Math.round(pt.estimated_1rm_kg * 2.20462)
          : +pt.estimated_1rm_kg.toFixed(1),
      })),
    [filteredPoints, isImperial],
  );

  const handleSelectMovement = (m: Movement) => {
    setSelectedId(m.id);
    setSelectedName(m.name);
    setPickerOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setTrendPoints([]); // clear stale chart while the new movement loads
  };

  // Derive display results: only show when query is non-empty (avoids clearing state in effect)
  const displayResults = searchQuery.trim() ? searchResults : [];

  // Loading = movement selected but its data hasn't come back yet
  const isLoading = selectedId !== null && selectedId !== loadedForId;

  return (
    <div
      className={cn(
        "bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-3",
        className,
      )}
      data-testid="mobile-strength-trend-card"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-[var(--foreground)]">
          Strength trend
        </p>
        <PeriodSelector
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
          label="Strength trend period"
        />
      </div>

      {/* Movement picker */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-[--border] bg-[--bg] text-sm hover:bg-[--surface] transition-colors focus-visible:ring-1 focus-visible:ring-[--accent] outline-none text-left"
          aria-label="Select movement"
          data-testid="movement-picker-trigger"
        >
          <Search
            className="h-3.5 w-3.5 flex-shrink-0"
            style={{ color: "var(--muted)" }}
          />
          <span
            style={{
              color: selectedName ? "var(--text)" : "var(--muted)",
            }}
          >
            {selectedName || "Search movement…"}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search movements…"
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-xs"
            />
            <CommandList>
              {displayResults.length === 0 && searchQuery.length > 0 && (
                <CommandEmpty
                  className="text-xs py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  No movements found
                </CommandEmpty>
              )}
              {displayResults.length === 0 && searchQuery.length === 0 && (
                <div className="py-3 text-center">
                  <Search
                    className="h-4 w-4 mx-auto"
                    style={{ color: "var(--muted)" }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    Type to search
                  </p>
                </div>
              )}
              {displayResults.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.name}
                  onSelect={() => handleSelectMovement(m)}
                  className="text-xs cursor-pointer"
                >
                  {m.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Chart area */}
      {!selectedId ? (
        <div className="h-[180px] flex items-center justify-center">
          <p
            className="text-xs italic"
            style={{ color: "var(--muted)" }}
            data-testid="empty-state"
          >
            log a strength set to see your trend
          </p>
        </div>
      ) : isLoading ? (
        <div
          className="h-[180px] rounded-[10px] animate-pulse"
          style={{ background: "var(--surface)" }}
          aria-label="Loading chart"
        />
      ) : chartData.length < 2 ? (
        <div className="h-[180px] flex items-center justify-center">
          <p
            className="text-xs italic text-center px-4"
            style={{ color: "var(--muted)" }}
            data-testid="empty-state"
          >
            log a strength set to see your trend
          </p>
        </div>
      ) : (
        <div
          aria-label={`e1RM trend chart for ${selectedName}`}
          data-testid="strength-trend-chart"
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                tickFormatter={fmtChartDay}
                tick={{
                  fill: "var(--muted)",
                  fontSize: 10,
                  fontFamily: "var(--font-geist-mono)",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fill: "var(--muted)",
                  fontSize: 10,
                  fontFamily: "var(--font-geist-mono)",
                }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => v.toFixed(0)}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelFormatter={(label) =>
                  typeof label === "string" ? fmtChartDay(label) : String(label)
                }
                formatter={(value) => [
                  typeof value === "number"
                    ? isImperial
                      ? `${value} lb`
                      : `${value.toFixed(1)} kg`
                    : String(value),
                  "Est. 1RM",
                ]}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: "var(--accent)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={!prefersReducedMotion}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
