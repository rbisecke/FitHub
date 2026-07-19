"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Movement } from "@/lib/api";
import type { MovementSubstituteOut } from "@/lib/api/plans";
import type { ApiClient } from "@/lib/api/client";
import { SheetOverlay } from "@/components/logging/SheetOverlay";

/**
 * Substitute movements (01 §9.3). Up to 20 movements sharing the source's
 * movement_pattern whose required equipment is a subset of the user's available
 * equipment. Empty (not an error) when the movement has no movement_pattern.
 * Rows reuse the §8 catalog styling; tapping one re-scopes the history feed to
 * that movement (MovementSubstituteOut carries no slug, so the movement-detail
 * route isn't directly reachable without an extra lookup).
 */
export function SubstitutesSheet({
  movement,
  equipment,
  client,
  onClose,
}: {
  movement: Movement;
  equipment: string[];
  client: ApiClient;
  onClose: () => void;
}) {
  const router = useRouter();
  const [subs, setSubs] = useState<MovementSubstituteOut[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.movements
      .getSubstitutes(movement.id, equipment, { signal: controller.signal })
      .then((rows) => {
        if (!cancelled) setSubs(rows);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setError(true);
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movement.id, equipment]);

  return (
    <SheetOverlay
      title="Substitute movements"
      onClose={onClose}
      maxHeight="80dvh"
    >
      {error && (
        <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
          Couldn&apos;t load substitutes.
        </p>
      )}
      {!error && subs === null && (
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          Finding substitutes…
        </p>
      )}
      {subs !== null && subs.length === 0 && (
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          No substitutes — this movement has no shared movement pattern.
        </p>
      )}
      {subs !== null && subs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {subs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onClose();
                router.push(
                  `/log/history?movement=${
                    s.id
                  }&movementName=${encodeURIComponent(s.name)}`,
                );
              }}
              className="rounded-[8px] px-3 py-2 text-left"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="block font-sans text-[14px]"
                style={{ color: "var(--text)" }}
              >
                {s.name}
              </span>
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                {s.movement_pattern.replace(/_/g, " ")}
                {s.equipment_required.length > 0
                  ? ` · ${s.equipment_required.join(", ")}`
                  : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </SheetOverlay>
  );
}
