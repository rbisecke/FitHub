"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { PRSparkline } from "./PRSparkline";
import { PRProjection } from "./PRProjection";
import { BenchmarkBadge } from "./BenchmarkBadge";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import { isBenchmark } from "@/lib/records/benchmarks";

function formatValue(pr: PersonalRecord): string {
  return `${pr.best_1rm_kg.toFixed(1)} kg`;
}

function toTagSlug(movementName: string, bestKg: number): string {
  const base = movementName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const val = `${Math.round(bestKg)}kg`;
  return `${base}-${val}`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (d.getFullYear() === now.getFullYear()) {
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

interface Props {
  pr: PersonalRecord;
  points: E1RMPoint[];
  isRecent: boolean;
}

export function PRCard({ pr, points, isRecent }: Props) {
  const [open, setOpen] = useState(false);
  // Reduced-motion is handled by CSS (.shimmer-overlay in globals.css)
  const [shimmer, setShimmer] = useState(isRecent);

  const slug = toTagSlug(pr.movement_name, pr.best_1rm_kg);
  const value = formatValue(pr);
  const benchmark = isBenchmark(pr.movement_name);

  const sortedPoints = [...points].sort((a, b) => a.day.localeCompare(b.day));

  let deltaNode: React.ReactNode = null;
  if (sortedPoints.length >= 2) {
    const prev = sortedPoints[sortedPoints.length - 2]!.estimated_1rm_kg;
    const curr = sortedPoints[sortedPoints.length - 1]!.estimated_1rm_kg;
    const delta = curr - prev;
    if (Math.abs(delta) > 0.01) {
      const positive = delta > 0;
      deltaNode = (
        <span
          className={`text-xs font-mono ${
            positive ? "text-green-400" : "text-red-400"
          }`}
        >
          {positive ? "▲" : "▼"} {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} kg
        </span>
      );
    }
  } else if (sortedPoints.length === 0) {
    deltaNode = (
      <span className="text-xs font-mono text-zinc-500">First logged</span>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-[--surface] border-[--border] p-0">
      {shimmer && (
        <div
          className="shimmer-overlay absolute inset-0 rounded-lg pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(210,153,34,0.15) 0%, transparent 60%)",
            animation: "shimmer-fade 2s 0.3s ease-out forwards",
          }}
          onAnimationEnd={() => setShimmer(false)}
        />
      )}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="w-full text-left p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:outline-none rounded-lg min-h-[44px]"
          aria-label={`${pr.movement_name} personal record, ${value}`}
        >
          <div className="flex items-center gap-2 mb-1 overflow-hidden">
            <span
              aria-hidden="true"
              className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 border border-[--border] bg-[#161b22] shrink-0 truncate max-w-full"
            >
              tag&nbsp;{slug}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-zinc-100">
              {pr.movement_name}
            </span>
            {benchmark && <BenchmarkBadge />}
          </div>
          <hr className="border-zinc-800 mb-2" />
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-50">
                {value}
              </span>
              <PRProjection
                points={sortedPoints}
                currentBestKg={pr.best_1rm_kg}
              />
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className="text-xs font-mono text-zinc-500"
                title={pr.achieved_at}
              >
                {formatDate(pr.achieved_at)}
              </span>
              {deltaNode}
            </div>
          </div>
          <div className="flex justify-end mt-1">
            <ChevronDown
              className={`h-4 w-4 text-zinc-600 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-xs text-zinc-500 font-mono mb-1">
                PR progression
              </p>
              <PRSparkline points={sortedPoints} />
            </div>

            {sortedPoints.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 font-mono mb-1">
                  PR history
                </p>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="text-left text-zinc-600 font-normal pb-1"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="text-left text-zinc-600 font-normal pb-1"
                      >
                        Value
                      </th>
                      <th
                        scope="col"
                        className="text-left text-zinc-600 font-normal pb-1"
                      >
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPoints.map((pt, idx) => {
                      const isCurrent = idx === sortedPoints.length - 1;
                      const prevKg =
                        idx > 0
                          ? sortedPoints[idx - 1]!.estimated_1rm_kg
                          : null;
                      const delta =
                        prevKg !== null ? pt.estimated_1rm_kg - prevKg : null;
                      return (
                        <tr key={`${pt.day}-${idx}`}>
                          <td className="text-zinc-500 pr-3 py-0.5">
                            {formatDate(pt.day)}
                          </td>
                          <td className="text-zinc-200 pr-3 py-0.5">
                            {pt.estimated_1rm_kg.toFixed(1)} kg
                          </td>
                          <td className="py-0.5">
                            {delta === null ? (
                              <span className="text-zinc-500">
                                First logged
                              </span>
                            ) : delta > 0.01 ? (
                              <span className="text-green-400">
                                ▲ +{delta.toFixed(1)} kg
                              </span>
                            ) : delta < -0.01 ? (
                              <span className="text-red-400">
                                ▼ {delta.toFixed(1)} kg
                              </span>
                            ) : null}
                            {isCurrent && (
                              <span className="text-zinc-600 italic ml-1">
                                ← current
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
