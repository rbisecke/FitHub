"use client";

import { useState, useEffect } from "react";
import { X, Plus, Search } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { tooltipContentStyle } from "@/lib/chart-utils";
import type { PersonalRecord, Movement, E1RMPoint } from "@/lib/api";
import {
  PeriodSelector,
  type PeriodOption,
} from "@/components/analytics/PeriodSelector";
import { SectionSkeleton } from "@/components/analytics/SectionSkeleton";
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
  { label: "4 weeks", value: "28" },
  { label: "12 weeks", value: "84" },
  { label: "All time", value: "730" },
];

const STORAGE_KEY = "progress.strength.period";
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Series palette sourced from the semantic brand tokens (single source of truth).
const LINE_COLORS = [
  "var(--purple)",
  "var(--green)",
  "var(--accent)",
  "var(--amber)",
];

type SeriesMap = Record<string, { name: string; points: E1RMPoint[] }>;

interface Props {
  personalRecords: PersonalRecord[];
  token: string;
  className?: string;
}

export function StrengthProgressSection({
  personalRecords,
  token,
  className,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    personalRecords.slice(0, 2).map((pr) => pr.movement_id),
  );
  const [period, setPeriod] = useState(() => {
    if (typeof window === "undefined") return "84";
    return localStorage.getItem(STORAGE_KEY) ?? "84";
  });
  const [series, setSeries] = useState<SeriesMap>({});
  const [searchResults, setSearchResults] = useState<Movement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const isLoading =
    selectedIds.length > 0 && selectedIds.some((id) => !(id in series));
  const displayResults = searchQuery.trim() ? searchResults : [];

  // Fetch e1rm trend for each selected movement — uses .then() so setState is async (passes lint)
  useEffect(() => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      const name =
        personalRecords.find((pr) => pr.movement_id === id)?.movement_name ??
        id;
      fetch(`${BASE}/api/v1/analytics/movement-trend/${id}?days=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.json() as Promise<E1RMPoint[]>;
        })
        .then((pts) =>
          setSeries((prev) => ({ ...prev, [id]: { name, points: pts } })),
        )
        .catch(() =>
          setSeries((prev) => ({ ...prev, [id]: { name, points: [] } })),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, period, token]);

  // Search movements
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

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setSeries({});
    localStorage.setItem(STORAGE_KEY, value);
  };

  const removeMovement = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setSeries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addMovement = (m: Movement) => {
    if (selectedIds.includes(m.id) || selectedIds.length >= 4) return;
    setSelectedIds((prev) => [...prev, m.id]);
    setPickerOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Build merged chart data by date
  const allDates = [
    ...new Set(
      Object.values(series).flatMap((s) => s.points.map((p) => p.day)),
    ),
  ].sort();

  const chartData = allDates.map((day) => {
    const row: Record<string, string | number> = { day: day.slice(5) };
    for (const [id, s] of Object.entries(series)) {
      const pt = s.points.find((p) => p.day === day);
      if (pt) row[id] = +pt.estimated_1rm_kg.toFixed(1);
    }
    return row;
  });

  const movementName = (id: string) =>
    series[id]?.name ??
    personalRecords.find((pr) => pr.movement_id === id)?.movement_name ??
    id;

  return (
    <div
      className={cn(
        "rounded-lg border border-[--border] bg-[--surface] p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[--text]">
          How your lifts are trending
        </p>
        <PeriodSelector
          options={PERIOD_OPTIONS}
          value={period}
          onChange={handlePeriodChange}
          label="Strength period"
        />
      </div>

      {/* Movement chips + picker */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {selectedIds.map((id, i) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border border-[--border] bg-[--bg] px-2 py-0.5 text-xs text-[--text]"
            style={{ borderColor: LINE_COLORS[i % LINE_COLORS.length] }}
          >
            {movementName(id)}
            <button
              onClick={() => removeMovement(id)}
              aria-label={`Remove ${movementName(id)}`}
              className="rounded-full hover:text-[--red] transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {selectedIds.length < 4 && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger className="inline-flex h-6 items-center gap-1 rounded-md border border-[--border] bg-transparent px-2 text-xs text-[--muted] hover:bg-[--surface] hover:text-[--text] transition-colors focus-visible:ring-1 focus-visible:ring-[--accent] outline-none">
              <Plus className="h-3 w-3" />
              Add movement
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search movements…"
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="text-xs"
                />
                <CommandList>
                  {displayResults.length === 0 && searchQuery.length > 0 && (
                    <CommandEmpty className="text-xs text-[--muted] py-3 text-center">
                      No movements found
                    </CommandEmpty>
                  )}
                  {displayResults.length === 0 && searchQuery.length === 0 && (
                    <div className="py-3 text-center">
                      <Search className="h-4 w-4 mx-auto text-[--muted]" />
                      <p className="text-xs text-[--muted] mt-1">
                        Type to search
                      </p>
                    </div>
                  )}
                  {displayResults.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.name}
                      onSelect={() => addMovement(m)}
                      disabled={selectedIds.includes(m.id)}
                      className="text-xs cursor-pointer"
                    >
                      {m.name}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {isLoading ? (
        <SectionSkeleton lines={0} chartHeight="h-52" />
      ) : selectedIds.length === 0 ? (
        <div className="h-52 flex items-center justify-center">
          <p className="text-xs text-[--muted]">
            Add a movement to see your trend
          </p>
        </div>
      ) : chartData.length < 2 ? (
        <div className="h-52 flex items-center justify-center">
          <p className="text-xs text-[--muted]">
            Not enough data for this period. Try expanding the time range.
          </p>
        </div>
      ) : (
        <div
          className="h-52 md:h-64 w-full"
          aria-label="Estimated one-rep max trend chart"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--chart-axis)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "var(--chart-axis)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => `${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                formatter={(value, name) => [
                  `${value} kg`,
                  series[name as string]?.name ?? (name as string),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, color: "var(--chart-axis)" }}
                formatter={(value) => series[value]?.name ?? value}
              />
              {selectedIds.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
