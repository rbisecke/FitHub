"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Result, Workout } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";
import {
  relativeDate,
  formatLabel,
  sessionLabel,
  formatWeight,
} from "@/lib/display";
import { formatTime } from "@/lib/time";
import { localDateKey, type DisplayUnits } from "@/lib/units";
import { isBenchmark } from "@/lib/workout/benchmarks";
import { ResultLine } from "@/components/logging/ResultLine";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { TrendPreview } from "./TrendPreview";

const PR_TOLERANCE_KG = 0.5;

interface MovementGroup {
  movementId: string | null;
  movementName: string;
  results: Result[];
  /** Result id that gets the strict PR badge (§6.4), or null. */
  prResultId: string | null;
}

/**
 * Workout detail — "git show" (01 §6). Full-page view of one committed workout:
 * header, read-only session metadata, the full result list with the STRICT
 * per-movement PR rule (a result is PR only if its e1RM ties the movement's
 * all-time best, and only the single best-tied result is marked), per-PR trend
 * previews, a partner co-authored-by line, and edit/delete. Two-pane on desktop.
 */
export function WorkoutDetail({
  workout,
  units,
  token,
}: {
  workout: Workout;
  units: DisplayUnits;
  token: string;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bestByMovement, setBestByMovement] = useState<Map<string, number>>(
    new Map(),
  );

  const results = useMemo(
    () =>
      (workout.results ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    [workout.results],
  );

  const movementIds = useMemo(
    () => [
      ...new Set(
        results.map((r) => r.movement_id).filter((x): x is string => !!x),
      ),
    ],
    [results],
  );

  // Strict-PR inputs: each movement's all-time-best e1RM (§6.4).
  useEffect(() => {
    if (movementIds.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.movements
      .personalRecordsBatch(movementIds, { signal: controller.signal })
      .then((prs) => {
        if (cancelled) return;
        const map = new Map<string, number>();
        for (const pr of prs) {
          if (pr.estimated_1rm_kg != null)
            map.set(pr.movement_id, Number(pr.estimated_1rm_kg));
        }
        setBestByMovement(map);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted)
          setBestByMovement(new Map());
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movementIds]);

  const groups = useMemo(
    () => groupResults(results, bestByMovement),
    [results, bestByMovement],
  );

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await client.workouts.del(workout.id);
      router.push("/log/history");
    } catch {
      setDeleting(false);
      setDeleteError("Couldn't delete this workout. Please try again.");
    }
  }

  const benchmark = isBenchmark(workout.title);
  const isPartner =
    workout.workout_format === "partner" || workout.workout_format === "team";

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* Metadata pane */}
        <aside className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1
                className="font-sans text-[20px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                {workout.title || "Untitled session"}
              </h1>
            </div>
            <div
              className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              <span>{relativeDate(localDateKey(workout.performed_at))}</span>
              <span>·</span>
              <span>{workout.short_hash}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {workout.session_type && (
                <Badge>{sessionLabel(workout.session_type)}</Badge>
              )}
              {workout.workout_format && (
                <Badge>{formatLabel(workout.workout_format)}</Badge>
              )}
              {benchmark && (
                <span
                  className="rounded-[4px] px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                  }}
                >
                  Benchmark
                </span>
              )}
            </div>
          </div>

          <MetadataBlock workout={workout} units={units} />

          {isPartner && (
            <p
              className="font-mono text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              Co-authored-by: partner session
              <span className="mt-0.5 block font-sans text-[11px]">
                Team session details live in your Sessions.
              </span>
            </p>
          )}

          <div className="flex gap-2">
            <Link
              href={`/workouts/${workout.short_hash}/edit`}
              className="rounded-[8px] px-3 py-2 font-sans text-[13px] font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-[8px] px-3 py-2 font-sans text-[13px] font-medium"
              style={{ border: "1px solid var(--red)", color: "var(--red)" }}
            >
              Delete
            </button>
          </div>
        </aside>

        {/* Results pane */}
        <div>
          {groups.length === 0 ? (
            <p
              className="font-sans text-[14px]"
              style={{ color: "var(--muted)" }}
            >
              No results logged — this was a rest day.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((group) => (
                <section key={group.movementId ?? group.movementName}>
                  {group.results.map((r) => (
                    <ResultLine
                      key={r.id}
                      result={r}
                      units={units}
                      isPr={r.id === group.prResultId}
                      showE1rm
                    />
                  ))}
                  {group.prResultId && group.movementId && (
                    <TrendPreview
                      movementId={group.movementId}
                      units={units}
                      client={client}
                    />
                  )}
                  {group.movementId && (
                    <Link
                      href={`/log/history?movement=${
                        group.movementId
                      }&movementName=${encodeURIComponent(group.movementName)}`}
                      className="mt-1 inline-block font-sans text-[11px]"
                      style={{ color: "var(--accent)" }}
                    >
                      See all {group.movementName} history →
                    </Link>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <SheetOverlay
          title="Delete this workout?"
          onClose={() => (deleting ? undefined : setConfirmDelete(false))}
          maxHeight="40dvh"
        >
          <p
            className="mb-4 font-sans text-[14px]"
            style={{ color: "var(--text)" }}
          >
            This can&apos;t be undone.
          </p>
          {deleteError && (
            <p
              className="mb-3 font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {deleteError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
              style={{
                background: "var(--red)",
                color: "#fff",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </SheetOverlay>
      )}
    </div>
  );
}

function MetadataBlock({
  workout,
  units,
}: {
  workout: Workout;
  units: DisplayUnits;
}) {
  const rows: [string, string][] = [];
  if (workout.duration_s != null)
    rows.push(["Duration", formatTime(workout.duration_s)]);
  if (workout.session_rpe != null)
    rows.push(["Session RPE", String(workout.session_rpe)]);
  if (workout.perceived_load_au != null)
    rows.push(["Perceived load", `${workout.perceived_load_au} au`]);
  if (workout.volume_load_kg != null)
    rows.push([
      "Volume load",
      formatWeight(Number(workout.volume_load_kg), units.weight),
    ]);
  if (workout.location) rows.push(["Location", workout.location]);
  if (workout.bodyweight_kg != null)
    rows.push([
      "Bodyweight",
      formatWeight(Number(workout.bodyweight_kg), units.weight),
    ]);

  if (rows.length === 0) return null;
  return (
    <dl
      className="flex flex-col gap-1.5 rounded-[10px] p-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <dt
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            {label}
          </dt>
          <dd
            className="font-mono tabular-nums text-[12px]"
            style={{ color: "var(--text)" }}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-[4px] px-1.5 py-0.5 font-sans text-[10px]"
      style={{
        background: "var(--surface)",
        color: "var(--muted)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </span>
  );
}

/** Group results by movement, marking the single strict-PR result per movement (§6.4). */
function groupResults(
  results: Result[],
  bestByMovement: Map<string, number>,
): MovementGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, Result[]>();
  for (const r of results) {
    const key = r.movement_id ?? `__${r.movement_name ?? "unknown"}`;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(r);
  }

  return order.map((key) => {
    const rows = byKey.get(key)!;
    const first = rows[0]!;
    const movementId = first.movement_id;
    let prResultId: string | null = null;
    if (movementId) {
      const best = bestByMovement.get(movementId);
      if (best != null) {
        // The single best-tied result: highest e1RM among these rows that ties
        // the movement's all-time best within float tolerance.
        let topId: string | null = null;
        let topE1rm = -Infinity;
        for (const r of rows) {
          const e =
            r.estimated_1rm_kg != null ? Number(r.estimated_1rm_kg) : null;
          if (e != null && e > topE1rm) {
            topE1rm = e;
            topId = r.id;
          }
        }
        if (topId != null && Math.abs(topE1rm - best) <= PR_TOLERANCE_KG)
          prResultId = topId;
      }
    }
    return {
      movementId,
      movementName: first.movement_name?.trim() || "Movement",
      results: rows,
      prResultId,
    };
  });
}
