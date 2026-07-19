"use client";

import { useEffect, useState } from "react";
import type { SavedRoutine } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";
import { SheetOverlay } from "./SheetOverlay";

/**
 * My Routines management (01 §2.9, step 3.18): rename, delete (confirmed), and
 * reorder saved routines. Reorder uses up/down controls that persist the new
 * order via the reorder endpoint (a keyboard-accessible alternative to drag).
 */
export function MyRoutinesSheet({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const [client] = useState(() => createApiClient(token));
  const [routines, setRoutines] = useState<SavedRoutine[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.routines
      .list({ signal: controller.signal })
      .then((data) => {
        if (!cancelled) setRoutines(data);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted)
          setError("Couldn't load routines.");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= routines.length) return;
    const reordered = [...routines];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item!);
    setRoutines(reordered);
    try {
      await client.routines.reorder(reordered.map((r) => r.id));
    } catch {
      setError("Couldn't save the new order.");
    }
  }

  async function rename(id: string) {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      const updated = await client.routines.rename(id, name);
      setRoutines((rs) => rs.map((r) => (r.id === id ? updated : r)));
      setRenaming(null);
    } catch {
      setError("Couldn't rename.");
    }
  }

  async function remove(id: string) {
    try {
      await client.routines.del(id);
      setRoutines((rs) => rs.filter((r) => r.id !== id));
      setConfirmDelete(null);
    } catch {
      setError("Couldn't delete.");
    }
  }

  return (
    <SheetOverlay title="My routines" onClose={onClose}>
      {error && (
        <p
          className="mb-3 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          {error}
        </p>
      )}
      {routines.length === 0 && (
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          No saved routines yet. Save one from a workout&apos;s overflow menu.
        </p>
      )}
      <div className="space-y-2">
        {routines.map((r, i) => (
          <div
            key={r.id}
            className="rounded-[10px] px-3 py-2.5"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {renaming === r.id ? (
              <div className="flex gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  aria-label="Routine name"
                  className="flex-1 rounded-[6px] px-2 py-1.5 font-sans text-[13px] outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => rename(r.id)}
                  className="rounded-[6px] px-3 font-sans text-[13px] font-semibold"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}
                >
                  Save
                </button>
              </div>
            ) : confirmDelete === r.id ? (
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-sans text-[13px]"
                  style={{ color: "var(--text)" }}
                >
                  Delete &ldquo;{r.name}&rdquo;?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="font-sans text-[13px]"
                    style={{ color: "var(--muted)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="font-sans text-[13px] font-semibold"
                    style={{ color: "var(--red)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className="truncate font-sans text-[14px] font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {r.name}
                  </p>
                  <p
                    className="truncate font-sans text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {(r.movements ?? []).length} movements
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${r.name} up`}
                    className="flex h-9 w-8 items-center justify-center font-data text-[13px] disabled:opacity-30"
                    style={{ color: "var(--muted)" }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === routines.length - 1}
                    aria-label={`Move ${r.name} down`}
                    className="flex h-9 w-8 items-center justify-center font-data text-[13px] disabled:opacity-30"
                    style={{ color: "var(--muted)" }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(r.name);
                      setRenaming(r.id);
                    }}
                    className="px-2 font-sans text-[12px]"
                    style={{ color: "var(--accent)" }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(r.id)}
                    aria-label={`Delete ${r.name}`}
                    className="px-2 font-sans text-[12px]"
                    style={{ color: "var(--red)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </SheetOverlay>
  );
}
