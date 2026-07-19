"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Workout, WorkoutSummary } from "@/lib/api";
import type { ApiClient } from "@/lib/api/client";
import { relativeDate, formatLabel, sessionLabel } from "@/lib/display";
import { localDateKey, type DisplayUnits } from "@/lib/units";
import { isBenchmark } from "@/lib/workout/benchmarks";
import { ResultLine } from "@/components/logging/ResultLine";

/**
 * Collapsed history summary card (01 §5.1, §5.2). Renders the `WorkoutSummary`
 * projection — title, time, `short_hash`, type/format badges, result count, and
 * the PR tag (`has_pr`) — then lazy-loads the full result rows on expand via one
 * `workouts.get` request, cancelled with AbortController if the card collapses
 * first (§5.6, project checklist rule). The whole header also deep-links to the
 * full `git show` detail page.
 */
export function WorkoutSummaryCard({
  workout,
  client,
  units,
}: {
  workout: WorkoutSummary;
  client: ApiClient;
  units: DisplayUnits;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!expanded || loadedId.current === workout.id) return;
    const controller = new AbortController();
    let cancelled = false;
    setState("loading");
    client.workouts
      .get(workout.id, { signal: controller.signal })
      .then((full) => {
        if (cancelled) return;
        setDetail(full);
        loadedId.current = workout.id;
        setState("idle");
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setState("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [expanded, workout.id, client, reloadKey]);

  const benchmark = isBenchmark(workout.title);
  const time = new Date(workout.performed_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const results = (detail?.results ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div
      className="rounded-[10px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start gap-2 px-4 pt-3">
        <Link
          href={`/workouts/${workout.short_hash}`}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <span
              className="truncate font-sans text-[14px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              {workout.title || "Untitled session"}
            </span>
            {workout.has_pr && (
              <span
                className="shrink-0 rounded-[4px] px-1 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--purple)",
                  border: "1px solid var(--purple)",
                }}
              >
                PR
              </span>
            )}
            {benchmark && (
              <span
                className="shrink-0 rounded-[4px] px-1 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                }}
              >
                Benchmark
              </span>
            )}
          </div>
          <div
            className="mt-0.5 flex items-center gap-2 font-mono text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            <span>{relativeDate(localDateKey(workout.performed_at))}</span>
            <span>·</span>
            <span>{time}</span>
            <span>·</span>
            <span>{workout.short_hash}</span>
          </div>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-2">
        {workout.session_type && (
          <Badge>{sessionLabel(workout.session_type)}</Badge>
        )}
        {workout.workout_format && (
          <Badge>{formatLabel(workout.workout_format)}</Badge>
        )}
        <span
          className="ml-auto font-mono text-[11px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {workout.result_count}{" "}
          {workout.result_count === 1 ? "result" : "results"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse results" : "Expand results"}
        className="flex w-full items-center justify-center gap-1 py-2 font-sans text-[11px]"
        style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}
      >
        {expanded ? "Hide results" : "Show results"}
        <span
          aria-hidden
          style={{ transform: expanded ? "rotate(180deg)" : undefined }}
        >
          ⌄
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {state === "loading" && (
            <p
              className="py-2 font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              Loading results…
            </p>
          )}
          {state === "error" && (
            <button
              type="button"
              onClick={() => {
                loadedId.current = null;
                setReloadKey((k) => k + 1);
              }}
              className="py-2 font-sans text-[12px]"
              style={{ color: "var(--red)" }}
            >
              Couldn&apos;t load results — retry
            </button>
          )}
          {state === "idle" && results.length === 0 && (
            <p
              className="py-2 font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              No results logged (rest day).
            </p>
          )}
          {state === "idle" &&
            results.map((r) => (
              <ResultLine
                key={r.id}
                result={r}
                units={units}
                isPr={r.is_pr}
                showE1rm
              />
            ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-[4px] px-1.5 py-0.5 font-sans text-[10px]"
      style={{
        background: "var(--bg)",
        color: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </span>
  );
}
