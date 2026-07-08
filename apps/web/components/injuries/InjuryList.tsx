"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { InjuryOut } from "@/lib/api/plans";

interface Props {
  initialInjuries: InjuryOut[];
  accessToken: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "active",
  cleared_with_restrictions: "cleared (restrictions)",
  resolved: "resolved",
  permanent: "permanent",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-[var(--red)] border-red-900 bg-red-950/30",
  cleared_with_restrictions:
    "text-[var(--amber)] border-amber-900 bg-amber-950/30",
  resolved: "text-[var(--green)] border-green-900 bg-green-950/30",
  permanent: "text-[var(--purple)] border-purple-900 bg-purple-950/30",
};

type UpdatableStatus = "cleared_with_restrictions" | "resolved" | "permanent";

export function InjuryList({ initialInjuries, accessToken }: Props) {
  const [injuries, setInjuries] = useState<InjuryOut[]>(initialInjuries);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restrictionNotes, setRestrictionNotes] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function updateStatus(injury: InjuryOut, status: UpdatableStatus) {
    setLoading(injury.id);
    setUpdateError(null);
    try {
      const updated = await api.injuries.updateStatus(accessToken, injury.id, {
        status,
        restriction_notes: restrictionNotes[injury.id] ?? null,
      });
      setInjuries((prev) =>
        prev.map((inj) => (inj.id === updated.id ? updated : inj)),
      );
      setExpandedId(null);
    } catch {
      setUpdateError("Failed to update injury status. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (injuries.length === 0) {
    return (
      <p
        data-testid="injury-list-empty"
        className="font-mono text-sm text-[var(--muted)]"
      >
        # no active injuries
      </p>
    );
  }

  return (
    <>
      {updateError && (
        <p className="text-[--red] text-sm mt-2">{updateError}</p>
      )}
      <ul data-testid="injury-list" className="flex flex-col gap-3">
        {injuries.map((injury) => (
          <li
            key={injury.id}
            data-testid="injury-list-item"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm font-semibold text-[var(--text)]">
                  {injury.body_region.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  pain {injury.pain_level}/10 ·{" "}
                  {injury.staleness_days === 0
                    ? "today"
                    : `${injury.staleness_days}d ago`}
                </span>
                {injury.notes && (
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {injury.notes}
                  </span>
                )}
              </div>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                  STATUS_COLORS[injury.status] ?? ""
                }`}
              >
                {STATUS_LABELS[injury.status] ?? injury.status}
              </span>
            </div>

            {injury.restriction_notes && (
              <p className="mt-2 font-mono text-xs text-amber-400">
                ⚠ {injury.restriction_notes}
              </p>
            )}

            {(injury.status === "active" || injury.status === "permanent") && (
              <div className="mt-3">
                {expandedId === injury.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={restrictionNotes[injury.id] ?? ""}
                      onChange={(e) =>
                        setRestrictionNotes((prev) => ({
                          ...prev,
                          [injury.id]: e.target.value,
                        }))
                      }
                      placeholder="restriction notes (optional)"
                      rows={2}
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 font-mono text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <div className="flex flex-wrap gap-2">
                      {injury.status === "active" && (
                        <button
                          data-testid="clear-with-restrictions-btn"
                          disabled={loading === injury.id}
                          onClick={() =>
                            updateStatus(injury, "cleared_with_restrictions")
                          }
                          className="rounded border border-amber-800 px-3 py-1 font-mono text-xs text-amber-400 hover:bg-amber-950/40 disabled:opacity-40"
                        >
                          {loading === injury.id
                            ? "updating…"
                            : "$ git checkout --restrictions"}
                        </button>
                      )}
                      {injury.status === "active" && (
                        <button
                          data-testid="permanent-btn"
                          disabled={loading === injury.id}
                          onClick={() => updateStatus(injury, "permanent")}
                          className="rounded border border-purple-900 px-3 py-1 font-mono text-xs text-[var(--purple)] hover:bg-purple-950/40 disabled:opacity-40"
                        >
                          {loading === injury.id
                            ? "updating…"
                            : "$ git tag --permanent"}
                        </button>
                      )}
                      <button
                        data-testid="resolve-btn"
                        disabled={loading === injury.id}
                        onClick={() => updateStatus(injury, "resolved")}
                        className="rounded border border-green-800 px-3 py-1 font-mono text-xs text-green-400 hover:bg-green-950/40 disabled:opacity-40"
                      >
                        {loading === injury.id
                          ? "updating…"
                          : "$ git merge --resolved"}
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    data-testid="update-status-btn"
                    onClick={() => setExpandedId(injury.id)}
                    className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    {injury.status === "permanent"
                      ? "edit notes →"
                      : "update status →"}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
