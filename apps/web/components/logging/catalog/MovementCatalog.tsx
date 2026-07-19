"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Movement, Modality } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";
import {
  pushRecentMovement,
  readRecent,
} from "@/components/logging/MovementSearchSheet";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { CreateMovementForm } from "./CreateMovementForm";

const MODALITIES: Modality[] = [
  "strength",
  "weightlifting",
  "gymnastics",
  "mono_structural",
  "plyometric",
  "carry",
  "strongman",
];

/**
 * Full movement catalog surface (01 §8). Search field, modality filter chips, a
 * local "Recent" section (last 8), and the official-first result list with a PR
 * badge on movements the user has a record for (populated by the batched
 * personal-records fetch, up to 20 at once — not one request per row). A
 * "+ Create '<query>'" affordance opens the create form. Light-themed; the
 * route wraps it in ForcedTheme.
 */
export function MovementCatalog({
  token,
  initialResults,
}: {
  token: string;
  initialResults: Movement[];
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);

  const [query, setQuery] = useState("");
  const [modality, setModality] = useState<Modality | null>(null);
  const [results, setResults] = useState<Movement[]>(initialResults);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [recent] = useState<Movement[]>(() =>
    typeof window !== "undefined" ? readRecent() : [],
  );
  const [prIds, setPrIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [retry, setRetry] = useState(0);

  const searching = query.trim() !== "" || modality !== null;

  // Skip the redundant mount fetch when SSR already delivered a browse list and
  // there's no active query/modality (avoids a double-fetch + "Searching…" flash).
  const firstRun = useRef(initialResults.length > 0);

  // Debounced search whenever query/modality change.
  useEffect(() => {
    if (firstRun.current && !searching) {
      firstRun.current = false;
      return;
    }
    firstRun.current = false;
    const controller = new AbortController();
    let cancelled = false;
    const handle = setTimeout(() => {
      setState("loading");
      client.movements
        .search(
          {
            q: query.trim() || undefined,
            modality: modality ?? undefined,
            limit: 20,
          },
          { signal: controller.signal },
        )
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setState("idle");
        })
        .catch((err) => {
          if (!cancelled && !controller.signal.aborted) setState("error");
          void err;
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
      controller.abort();
    };
  }, [client, query, modality, retry, searching]);

  // Batched PR badges for the displayed rows AND the recent list (up to 20 at
  // once, §8) so recent-only movements still show a PR badge.
  useEffect(() => {
    const ids = [...new Set([...results, ...recent].map((m) => m.id))].slice(
      0,
      20,
    );
    if (ids.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.movements
      .personalRecordsBatch(ids, { signal: controller.signal })
      .then((prs) => {
        if (cancelled) return;
        setPrIds(new Set(prs.map((p) => p.movement_id)));
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setPrIds(new Set());
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, results, recent]);

  function open(m: Movement) {
    pushRecentMovement(m);
    router.push(`/movements/${m.slug}`);
  }

  const showCreate = searching && state === "idle" && query.trim() !== "";

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-4">
      <h1
        className="mb-3 font-data text-[18px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        Movements
      </h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movements…"
        aria-label="Search movements"
        className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
        }}
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {MODALITIES.map((m) => {
          const active = modality === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setModality(active ? null : m)}
              aria-pressed={active}
              className="rounded-full px-2.5 py-1 font-sans text-[11px]"
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "var(--bg)" : "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              {m.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {!searching && recent.length > 0 && (
        <section className="mt-5">
          <h2
            className="mb-2 font-mono text-[12px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Recent
          </h2>
          <div className="flex flex-col gap-1.5">
            {recent.map((m) => (
              <MovementRow
                key={m.id}
                movement={m}
                hasPr={prIds.has(m.id)}
                onOpen={open}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2
          className="mb-2 font-mono text-[12px] uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          {searching ? "Results" : "All movements"}
        </h2>

        {/* State is a non-destructive banner — a failed/pending search never
            blanks the results already on screen. */}
        {state === "loading" && (
          <p
            className="mb-1 font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Searching…
          </p>
        )}
        {state === "error" && (
          <button
            type="button"
            onClick={() => setRetry((r) => r + 1)}
            className="mb-1 font-sans text-[12px]"
            style={{ color: "var(--red)" }}
          >
            Couldn&apos;t refresh — retry
          </button>
        )}
        <div className="flex flex-col gap-1.5">
          {results.map((m) => (
            <MovementRow
              key={m.id}
              movement={m}
              hasPr={prIds.has(m.id)}
              onOpen={open}
            />
          ))}
          {state === "idle" && results.length === 0 && (
            <p
              className="py-2 font-sans text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              No movements match.
            </p>
          )}
        </div>

        {showCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-3 w-full rounded-[8px] px-3 py-2 text-left font-sans text-[13px] font-medium"
            style={{
              border: "1px dashed var(--accent)",
              color: "var(--accent)",
            }}
          >
            + Create “{query.trim()}”
          </button>
        )}
      </section>

      {creating && (
        <SheetOverlay
          title="Create a movement"
          onClose={() => setCreating(false)}
          maxHeight="88dvh"
        >
          <CreateMovementForm
            initialName={query.trim()}
            client={client}
            onCreated={(m) => {
              setCreating(false);
              open(m);
            }}
            onCancel={() => setCreating(false)}
          />
        </SheetOverlay>
      )}
    </div>
  );
}

function MovementRow({
  movement,
  hasPr,
  onOpen,
}: {
  movement: Movement;
  hasPr: boolean;
  onOpen: (m: Movement) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(movement)}
      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-left"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className="truncate font-sans text-[14px]"
            style={{ color: "var(--text)" }}
          >
            {movement.name}
            {movement.implement ? ` (${movement.implement})` : ""}
          </span>
          {!movement.is_official && (
            <span
              className="shrink-0 rounded-[4px] px-1 py-0.5 font-sans text-[9px] uppercase tracking-wide"
              style={{
                background: "var(--bg)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              custom
            </span>
          )}
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          {movement.modality.replace(/_/g, " ")}
        </span>
      </span>
      {hasPr && (
        <span
          className="shrink-0 rounded-[4px] px-1 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--purple)", border: "1px solid var(--purple)" }}
        >
          PR
        </span>
      )}
    </button>
  );
}
