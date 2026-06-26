"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DonutChart, type DonutSlice } from "@/components/ui/donut-chart";
import {
  PeriodSelector,
  type PeriodOption,
} from "@/components/analytics/PeriodSelector";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface BalanceBreakdown {
  category: string;
  volume_pct: number;
  load_au: number;
}

interface TrainingBalanceData {
  breakdown: BalanceBreakdown[];
  period_days: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Last 4 weeks", value: "28" },
  { label: "Last 12 weeks", value: "84" },
];

const STORAGE_KEY = "progress.balance.period";

// Category colors map to the semantic brand tokens (single source of truth).
const CATEGORY_COLORS: Record<string, string> = {
  pull: "var(--accent)",
  push: "var(--purple)",
  legs: "var(--green)",
  core: "var(--amber)",
  conditioning: "var(--cyan)",
};

function getInsightCopy(breakdown: BalanceBreakdown[]): string {
  const map = Object.fromEntries(
    breakdown.map((b) => [b.category, b.volume_pct]),
  );
  const pull = map["pull"] ?? 0;
  const push = map["push"] ?? 0;
  const conditioning = map["conditioning"] ?? 0;
  const legs = map["legs"] ?? 0;

  if (push - pull > 0.1)
    return "You're pushing more than pulling — consider adding rows or pull-up work.";
  if (conditioning < 0.1)
    return "Less than 10% conditioning this period. Add a metcon or two.";
  if (legs < 0.15) return "Light on leg work this period.";
  return "Good balance across movement patterns.";
}

interface Props {
  data: TrainingBalanceData | null;
  className?: string;
}

export function TrainingBalanceSection({ data, className }: Props) {
  const [period, setPeriod] = useState(() => {
    if (typeof window === "undefined") return "28";
    return localStorage.getItem(STORAGE_KEY) ?? "28";
  });
  const [isOpen, setIsOpen] = useState(false);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const inner = (
    <div className="space-y-3">
      {data !== null && (
        <div className="flex items-center justify-between gap-2">
          <PeriodSelector
            options={PERIOD_OPTIONS}
            value={period}
            onChange={handlePeriodChange}
            label="Balance period"
          />
        </div>
      )}

      {data === null ? (
        <div className="py-8 text-center">
          {/* Ghost donut — the shape of the chart, waiting to be filled. */}
          <div
            aria-hidden="true"
            className="mx-auto mb-3 h-16 w-16 rounded-full border-4 border-[--border]"
          />
          <p className="text-xs text-[--muted-strong]">
            No movement categories tagged yet
          </p>
          <p className="font-mono text-[10px] text-[--muted] mt-1">
            $ git diff --stat · tag movements to see your split
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <DonutChart
              data={data.breakdown.map(
                (b): DonutSlice => ({
                  name:
                    b.category.charAt(0).toUpperCase() + b.category.slice(1),
                  value: Math.round(b.volume_pct * 100),
                  color: CATEGORY_COLORS[b.category] ?? "var(--muted)",
                }),
              )}
              className="w-full sm:w-48 flex-shrink-0"
              innerRadius={50}
              outerRadius={75}
              showLegend={false}
            />
            <ul className="flex-1 space-y-2 w-full">
              {data.breakdown.map((b) => (
                <li
                  key={b.category}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[b.category] ?? "var(--muted)",
                    }}
                  />
                  <span className="text-[--text] capitalize flex-1">
                    {b.category}
                  </span>
                  <span className="font-mono text-[--muted]">
                    {Math.round(b.volume_pct * 100)}%
                  </span>
                  <span className="font-mono text-[--muted]/60 text-[10px]">
                    {b.load_au.toLocaleString()} AU
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-[--muted] border-t border-[--border] pt-2">
            {getInsightCopy(data.breakdown)}
          </p>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: collapsible, collapsed by default */}
      <div
        className={cn(
          "md:hidden rounded-lg border border-[--border] bg-[--surface]",
          className,
        )}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-sm font-medium text-[--text]">
            Training balance · {period === "28" ? "4 weeks" : "12 weeks"}
            <ChevronRight
              className={cn(
                "h-4 w-4 text-[--muted] transition-transform",
                isOpen && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">{inner}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      {/* Desktop: always visible */}
      <div
        className={cn(
          "hidden md:block rounded-lg border border-[--border] bg-[--surface] p-4 space-y-3",
          className,
        )}
      >
        <p className="text-sm font-medium text-[--text]">Training balance</p>
        {inner}
      </div>
    </>
  );
}
