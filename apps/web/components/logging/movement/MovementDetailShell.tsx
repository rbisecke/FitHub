"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Movement, MovementHistoryEntry } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";
import type { DisplayUnits } from "@/lib/units";
import { ImplementSideSelector } from "./ImplementSideSelector";
import { AboutTab, HistoryTab, ChartsTab, RecordsTab } from "./MovementTabs";
import { SubstitutesSheet } from "./SubstitutesSheet";

export type MovementTab = "about" | "history" | "charts" | "records";
const TABS: MovementTab[] = ["about", "history", "charts", "records"];

/**
 * Movement detail shell (01 §9) — the tabbed About / History / Charts / Records
 * surface. The `(implement, side)` selector (§9.1) is shared across History,
 * Charts, and Records and hidden on About; its state lives in the URL query so it
 * persists across the path-segment tabs and re-scopes whichever is visible. The
 * scoped movement-history fetch (BG-26) feeds both History and Charts.
 */
export function MovementDetailShell({
  movement,
  tab,
  implement,
  side,
  units,
  equipment,
  token,
}: {
  movement: Movement;
  tab: MovementTab;
  implement: string | null;
  side: string | null;
  units: DisplayUnits;
  equipment: string[];
  token: string;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);

  const [history, setHistory] = useState<MovementHistoryEntry[]>([]);
  const [historyState, setHistoryState] = useState<
    "loading" | "error" | "idle"
  >("loading");
  const [showSubs, setShowSubs] = useState(false);

  const needsHistory = tab === "history" || tab === "charts";

  useEffect(() => {
    if (!needsHistory) return;
    const controller = new AbortController();
    let cancelled = false;
    // Defer the loading flag out of the effect body (no synchronous setState).
    Promise.resolve().then(() => {
      if (!cancelled) setHistoryState("loading");
    });
    client.analytics
      .movementHistory(
        movement.id,
        { implement: implement ?? undefined, side: side ?? undefined },
        { signal: controller.signal },
      )
      .then((rows) => {
        if (cancelled) return;
        setHistory(rows);
        setHistoryState("idle");
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setHistoryState("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movement.id, implement, side, needsHistory]);

  function queryFor(
    nextImplement: string | null,
    nextSide: string | null,
  ): string {
    const qs = new URLSearchParams();
    if (nextImplement) qs.set("implement", nextImplement);
    if (nextSide) qs.set("side", nextSide);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  const query = queryFor(implement, side);

  function onSelectorChange(next: {
    implement: string | null;
    side: string | null;
  }) {
    router.replace(
      `/movements/${movement.slug}/${tab}${queryFor(
        next.implement,
        next.side,
      )}`,
      {
        scroll: false,
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-4">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h1
            className="font-sans text-[20px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            {movement.name}
            {movement.implement ? ` (${movement.implement})` : ""}
          </h1>
          {!movement.is_official && (
            <span
              className="rounded-[4px] px-1 py-0.5 font-sans text-[9px] uppercase tracking-wide"
              style={{
                background: "var(--surface)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              custom
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowSubs(true)}
          className="mt-1 font-sans text-[12px]"
          style={{ color: "var(--accent)" }}
        >
          Find substitutes
        </button>
      </div>

      {/* Tab bar — real route navigations, so a nav with aria-current rather
          than tablist/tab semantics. */}
      <nav
        aria-label="Movement views"
        className="flex gap-1 rounded-[8px] p-1"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <Link
              key={t}
              href={`/movements/${movement.slug}/${t}${query}`}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className="flex flex-1 min-h-[44px] items-center justify-center rounded-[6px] text-center font-sans text-[13px] capitalize"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--bg)" : "var(--muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {t}
            </Link>
          );
        })}
      </nav>

      {/* Shared (implement, side) selector — hidden on About (§9.1). */}
      {tab !== "about" && (
        <div className="mt-3">
          <ImplementSideSelector
            movement={movement}
            implement={implement}
            side={side}
            onChange={onSelectorChange}
          />
        </div>
      )}

      <div className="mt-4">
        {tab === "about" && <AboutTab movement={movement} />}
        {tab === "history" && (
          <HistoryTab entries={history} state={historyState} units={units} />
        )}
        {tab === "charts" && (
          <ChartsTab entries={history} state={historyState} units={units} />
        )}
        {tab === "records" && (
          <RecordsTab
            movementId={movement.id}
            implement={implement}
            side={side}
            units={units}
            client={client}
          />
        )}
      </div>

      {showSubs && (
        <SubstitutesSheet
          movement={movement}
          equipment={equipment}
          client={client}
          onClose={() => setShowSubs(false)}
        />
      )}
    </div>
  );
}
