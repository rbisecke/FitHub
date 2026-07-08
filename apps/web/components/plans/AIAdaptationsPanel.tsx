"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { createApiClient } from "@/lib/api/client";
import type { AdaptationOut } from "@/lib/api/plans";

interface Props {
  planId: string;
  accessToken: string;
}

export function AIAdaptationsPanel({ planId, accessToken }: Props) {
  const client = useMemo(() => createApiClient(accessToken), [accessToken]);
  const [adaptations, setAdaptations] = useState<AdaptationOut[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.adaptations
      .list(planId, { signal: controller.signal })
      .then((data) => {
        if (!cancelled)
          setAdaptations(data.filter((a) => a.status === "proposed"));
      })
      .catch(() => {
        if (!cancelled) setAdaptations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, planId]);

  const handleApply = useCallback(
    async (id: string) => {
      setApplying(id);
      try {
        await client.adaptations.merge(id);
        setAdaptations((prev) => prev?.filter((a) => a.id !== id) ?? null);
      } catch {
        toast.error("Failed to apply adaptation — please try again.");
      } finally {
        setApplying(null);
      }
    },
    [client],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      setDismissing(id);
      try {
        await client.adaptations.reject(id);
        setAdaptations((prev) => prev?.filter((a) => a.id !== id) ?? null);
      } catch {
        toast.error("Failed to dismiss adaptation — please try again.");
      } finally {
        setDismissing(null);
      }
    },
    [client],
  );

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 animate-fadeUp">
      <div className="flex items-center gap-3 mb-4">
        <div>
          <span className="font-heading text-[15px] text-[var(--foreground)]">
            AI Adaptations
          </span>
          <span className="font-data text-[11px] text-[var(--accent)] ml-2">
            $ git suggest
          </span>
        </div>
        <span className="ml-auto text-[10px] font-bold text-[var(--blue)] bg-[rgba(88,166,255,0.12)] border border-[rgba(88,166,255,0.3)] px-2 py-0.5 rounded-full flex-shrink-0">
          AI
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3.5 animate-pulse"
            >
              <div className="h-3 bg-[var(--border)] rounded w-3/4 mb-2" />
              <div className="h-2 bg-[var(--border)] rounded w-full mb-1" />
              <div className="h-2 bg-[var(--border)] rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : !adaptations || adaptations.length === 0 ? (
        <p className="font-data text-[13px] text-[var(--muted)] text-center py-4">
          # no adaptations proposed — plan looks good
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {adaptations.map((a) => (
            <div
              key={a.id}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3.5"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-[var(--accent)] text-[14px] flex-shrink-0 mt-0.5">
                  💡
                </span>
                <span className="font-sans text-[14px] font-bold text-[var(--foreground)] leading-snug">
                  {a.trigger_type.replace(/_/g, " ")}
                </span>
              </div>
              {a.rationale && (
                <p className="font-sans text-[12.5px] text-[var(--muted)] leading-relaxed mb-3">
                  {a.rationale}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApply(a.id)}
                  disabled={applying === a.id || dismissing === a.id}
                  className="font-data text-[11px] text-[var(--accent)] border border-[rgba(74,222,128,0.4)] px-3 py-1 rounded-full hover:bg-[rgba(74,222,128,0.08)] transition-colors disabled:opacity-50"
                >
                  {applying === a.id ? "Applying…" : "Apply"}
                </button>
                <button
                  onClick={() => handleDismiss(a.id)}
                  disabled={applying === a.id || dismissing === a.id}
                  className="font-data text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2 py-1 disabled:opacity-50"
                >
                  {dismissing === a.id ? "Dismissing…" : "Dismiss"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
