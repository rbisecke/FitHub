"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { identityColor, normalizeGuestName } from "@fithub/shared";
import { api, ApiError } from "@/lib/api/client";
import type { TrainingPartner } from "@/lib/api";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { Button } from "@/components/ui/button";
import { AddPartnerSheet } from "./AddPartnerSheet";

/**
 * Training partners roster (06 §8a). Light theme (F1 — seated roster
 * review). Ranked by `session_count` descending — already the list
 * endpoint's own `ORDER BY`, so no client-side sort is needed.
 *
 * Two mechanisms feed this one list (history-derived co-participation, and
 * explicit add-by-email) and the UI deliberately never distinguishes them
 * (§8a — GitHub's Follow precedent: no provenance badges).
 */
export function TrainingPartnersScreen({
  token,
  initialPartners,
}: {
  token: string;
  initialPartners: TrainingPartner[];
}) {
  const [partners, setPartners] = useState<TrainingPartner[]>(initialPartners);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TrainingPartner | null>(
    null,
  );
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  function handleAdded(partner: TrainingPartner) {
    // A freshly-added partner always starts at session_count: 0, so it
    // belongs at the end of the session_count-descending order the list
    // endpoint returns — appending (not prepending) keeps that invariant
    // true for the optimistic update too.
    setPartners((prev) => [...prev, partner]);
  }

  async function handleRemove() {
    const target = removeTarget;
    if (!target?.user_id) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await api.removeTrainingPartner(token, target.user_id);
      setPartners((prev) => prev.filter((p) => p.user_id !== target.user_id));
      setRemoveTarget(null);
    } catch (err) {
      // A 404 means there was no explicit training_partners row for this
      // person (e.g. they only ever showed up via shared-session history) —
      // there's nothing server-side to delete, but the user's intent (take
      // them off the roster right now) is still honored. Note this can
      // reappear after a future shared session, since the history mechanism
      // recomputes live and isn't tracked by this delete.
      if (err instanceof ApiError && err.status === 404) {
        setPartners((prev) => prev.filter((p) => p.user_id !== target.user_id));
        setRemoveTarget(null);
      } else {
        setRemoveError("Couldn't remove that partner. Please try again.");
      }
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="pb-nav-safe mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="type-h2 text-foreground">Training partners</h1>
        <Button onClick={() => setAddOpen(true)}>Add by email</Button>
      </div>

      {partners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="type-small text-muted-foreground">
            No training partners yet. They&apos;ll show up here after you log a
            session together, or add someone by email.
          </p>
          <Button onClick={() => setAddOpen(true)}>Add by email</Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {partners.map((p, index) => {
            const seed = p.user_id ?? p.guest_name ?? p.display_name;
            const { cssVar } = identityColor(
              p.user_id === null ? normalizeGuestName(seed) : seed,
            );
            return (
              <li
                // Guest rows have no stable id (guest_name is free text and
                // can collide across different sessions) — the index
                // tie-breaker only ever applies to that fallback branch.
                key={p.user_id ?? `guest-${p.guest_name}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card py-2.5 pr-3 pl-2.5"
                style={{ borderLeft: `3px solid ${cssVar}` }}
              >
                <AvatarMonogram
                  name={p.display_name}
                  seed={seed}
                  isGuest={p.user_id === null}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="type-small truncate font-medium text-foreground">
                      {p.display_name}
                    </span>
                    {p.user_id === null && (
                      <span className="type-caption">guest</span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {p.session_count} session{p.session_count === 1 ? "" : "s"}
                  </span>
                </div>
                {p.user_id !== null && (
                  <button
                    type="button"
                    aria-label={`Remove ${p.display_name} as a training partner`}
                    onClick={() => setRemoveTarget(p)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {addOpen && (
        <AddPartnerSheet
          token={token}
          onAdded={handleAdded}
          onClose={() => setAddOpen(false)}
        />
      )}

      {removeTarget && (
        <SheetOverlay
          title={`Remove ${removeTarget.display_name} as a training partner?`}
          onClose={() => (removing ? undefined : setRemoveTarget(null))}
          maxHeight="40dvh"
        >
          <p
            className="mb-4 font-sans text-[14px]"
            style={{ color: "var(--text)" }}
          >
            You can add them again later by email.
          </p>
          {removeError && (
            <p
              className="mb-3 font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {removeError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
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
              onClick={() => void handleRemove()}
              disabled={removing}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
              style={{
                background: "var(--red)",
                color: "var(--bg)",
                opacity: removing ? 0.7 : 1,
              }}
            >
              Remove
            </button>
          </div>
        </SheetOverlay>
      )}
    </div>
  );
}
