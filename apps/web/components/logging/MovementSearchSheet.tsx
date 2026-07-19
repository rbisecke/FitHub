"use client";

import { useEffect, useMemo, useState } from "react";
import type { Movement } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";
import { SheetOverlay } from "./SheetOverlay";

const RECENT_KEY = "fithub:recent_movements";
const MODALITIES = [
  "strength",
  "weightlifting",
  "gymnastics",
  "mono_structural",
  "plyometric",
] as const;

/** Read the local "recent movements" cache (last 8) — 01 §2.5. */
export function readRecent(): Movement[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as Movement[]).slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** Push a movement to the front of the recent list (dedup, cap 8) — 01 §2.5. */
export function pushRecentMovement(m: Movement): void {
  try {
    const current = readRecent().filter((x) => x.id !== m.id);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([m, ...current].slice(0, 8)),
    );
  } catch {
    // localStorage unavailable — recents are a best-effort local nicety.
  }
}

/**
 * Movement search sheet (01 §2.5). Recent (localStorage, last 8) + case-insensitive
 * catalog search, official-first, modality filter, and a create-new affordance on
 * no match. Picking pre-selects the movement's default_result_type.
 */
export function MovementSearchSheet({
  token,
  onPick,
  onClose,
}: {
  token: string;
  onPick: (m: Movement) => void;
  onClose: () => void;
}) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [query, setQuery] = useState("");
  const [modality, setModality] = useState<string | null>(null);
  const [results, setResults] = useState<Movement[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error" | "loaded">(
    "idle",
  );
  const [recent] = useState<Movement[]>(() =>
    typeof window !== "undefined" ? readRecent() : [],
  );
  const [retryNonce, setRetryNonce] = useState(0);

  const searching = Boolean(query) || Boolean(modality);

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    let cancelled = false;
    // Defer the loading flag into a microtask so no setState runs synchronously
    // during the effect body.
    Promise.resolve().then(() => {
      if (!cancelled) setState("loading");
    });
    client.movements
      .search(
        {
          q: query || undefined,
          modality: modality || undefined,
          limit: 30,
        },
        { signal: controller.signal },
      )
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setState("loaded");
        }
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setState("error");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query, modality, searching, retryNonce, client]);

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    // Pure fallback (no Date.now) for a name that slugifies to empty; a real
    // collision surfaces as a 409 and is handled below.
    const fallbackSlug = `custom-${name.length}-${name.charCodeAt(0) || 0}`;
    try {
      const created = await client.movements.create({
        name,
        slug: slug || fallbackSlug,
        base_movement: name,
        modality: "strength",
        default_result_types: ["weight"],
        default_result_type: "weight",
      });
      pick(created);
    } catch {
      setState("error");
    }
  }

  function pick(m: Movement) {
    pushRecentMovement(m);
    onPick(m);
  }

  const row = (m: Movement) => (
    <button
      key={m.id}
      type="button"
      onClick={() => pick(m)}
      className="flex w-full items-center justify-between rounded-[6px] px-3 py-2.5 text-left"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="flex items-center gap-2">
        <span
          className="font-sans text-[14px]"
          style={{ color: "var(--text)" }}
        >
          {m.name}
        </span>
        {!m.is_official && (
          <span
            className="rounded-[4px] px-1.5 py-0.5 font-data text-[9px] uppercase"
            style={{ background: "var(--bg)", color: "var(--muted)" }}
          >
            custom
          </span>
        )}
      </span>
      <span className="font-data text-[10px]" style={{ color: "var(--muted)" }}>
        {m.modality}
      </span>
    </button>
  );

  return (
    <SheetOverlay title="Add movement" onClose={onClose}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movements…"
        aria-label="Search movements"
        className="mb-3 w-full rounded-[8px] px-3 py-2 font-sans text-[14px] outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {MODALITIES.map((mod) => {
          const active = modality === mod;
          return (
            <button
              key={mod}
              type="button"
              onClick={() => setModality(active ? null : mod)}
              className="rounded-[6px] px-2.5 py-1 font-data text-[11px]"
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                border: `1px solid ${
                  active ? "var(--accent)" : "var(--border)"
                }`,
                color: active ? "var(--bg)" : "var(--muted)",
              }}
            >
              {mod}
            </button>
          );
        })}
      </div>

      {!searching && recent.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="font-data text-[10px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Recent
          </p>
          {recent.map(row)}
        </div>
      )}
      {!searching && recent.length === 0 && (
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          Search the catalog to add a movement.
        </p>
      )}
      {searching && state === "loading" && (
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          Searching…
        </p>
      )}
      {searching && state === "error" && (
        <button
          type="button"
          onClick={() => setRetryNonce((n) => n + 1)}
          className="font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          Couldn&apos;t search — retry
        </button>
      )}
      {searching && state === "loaded" && (
        <div className="space-y-1.5">
          {results.map(row)}
          {results.length === 0 && query.trim() && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full rounded-[6px] px-3 py-2.5 text-left font-sans text-[14px]"
              style={{
                background: "var(--surface)",
                border: "1px dashed var(--accent)",
                color: "var(--accent)",
              }}
            >
              + Create &ldquo;{query.trim()}&rdquo; as a new movement
            </button>
          )}
        </div>
      )}
    </SheetOverlay>
  );
}
