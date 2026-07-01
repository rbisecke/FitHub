"use client";

import { cn } from "@/lib/utils";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import Link from "next/link";

interface BenchmarkAttempt {
  date: string;
  result_display: string;
  result_seconds: number;
}

interface BenchmarkEntry {
  name: string;
  attempts: BenchmarkAttempt[];
  pr_display: string;
  improvement_display: string;
}

export interface BenchmarkResponseData {
  benchmarks: BenchmarkEntry[];
}

interface Props {
  data: BenchmarkResponseData | null;
  className?: string;
}

function BenchmarkSparkline({ attempts }: { attempts: BenchmarkAttempt[] }) {
  if (attempts.length < 2) return null;
  const data = attempts.map((a) => ({ v: a.result_seconds }));
  return (
    <div className="h-10 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <YAxis domain={["auto", "auto"]} reversed hide />
          <Line
            type="monotone"
            dataKey="v"
            stroke="var(--purple)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BenchmarkProgressSection({ data, className }: Props) {
  return (
    <div
      className={cn(
        "bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-3",
        className,
      )}
    >
      <div>
        <p className="text-[15px] font-bold text-[var(--foreground)]">
          Benchmark WODs
        </p>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          The girls &amp; heroes — your standardised test scores
        </p>
      </div>

      {data === null || data.benchmarks.length === 0 ? (
        <div className="py-4 text-center space-y-2">
          <p className="text-xs text-[--muted]">
            No benchmark WODs logged yet.
          </p>
          <p className="text-xs text-[--muted]">
            Next time you do Fran, Cindy, or another named WOD, tag it as a
            Benchmark when logging.
          </p>
          <Link
            href="/log/new"
            className="font-mono text-xs text-[--accent] hover:underline"
          >
            $ commit
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {data.benchmarks.map((b) => (
            <li key={b.name}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {b.name}
                </span>
                <span className="font-data text-xs text-[var(--gold)]">
                  {b.pr_display}
                </span>
              </div>
              {b.improvement_display && (
                <p className="text-[10px] text-[--muted] mb-1">
                  {b.improvement_display}
                </p>
              )}
              <BenchmarkSparkline attempts={b.attempts} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
