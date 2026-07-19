"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from "lucide-react";
import type { InjuryOut } from "@/lib/api/plans";
import type { ApiClient } from "@/lib/api/client";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { RegionGlyph } from "@/components/injuries/RegionGlyph";
import { regionLabel } from "@/components/injuries/RegionChipStrip";
import {
  injuryStatusMeta,
  stalenessLabel,
} from "@/components/injuries/injuryDisplay";
import {
  allowedTransitions,
  restrictionNotesEditable,
  type InjuryStatus,
} from "@/components/injuries/injuryStatusTransitions";

const STATUS_ICON = {
  alert: AlertTriangle,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  lock: Lock,
} as const;

const NOTES_MAX = 1000;
const RESOLVE_CONFIRM_COPY =
  "Mark resolved — you can't reopen this later; you'd file a new report.";

/** Statuses whose PATCH request can re-send the SAME status just to persist notes. */
const NOTES_ONLY_SAVE_STATUSES = new Set<InjuryStatus>([
  "cleared_with_restrictions",
  "permanent",
]);

/**
 * Injury detail overlay (05 §2.1 — plan steps 4.16, 4.17). Uses the
 * hand-built `SheetOverlay` (bottom sheet on mobile, centered dialog on
 * desktop ≥768px) rather than the shadcn Sheet/AlertDialog primitives: both
 * portal to `document.body`, which escapes this page's forced-light
 * `data-theme` wrapper and would render the overlay in the app's dark theme
 * (see `SheetOverlay`'s own doc comment and `WorkoutDetail.tsx`'s identical
 * delete-confirmation pattern, which this mirrors for the resolve confirm).
 */
export function InjuryDetailSheet({
  injury,
  client,
  onClose,
  onUpdated,
}: {
  injury: InjuryOut;
  client: ApiClient;
  onClose: () => void;
  onUpdated: (updated: InjuryOut) => void;
}) {
  const [notesDraft, setNotesDraft] = useState(injury.restriction_notes ?? "");
  const [notesValidationError, setNotesValidationError] = useState<
    string | null
  >(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);

  const meta = injuryStatusMeta(injury);
  const Icon = STATUS_ICON[meta.icon];
  const transitions = allowedTransitions(injury.status);
  const notesEditable = restrictionNotesEditable(injury.status);
  const notesChanged = notesDraft !== (injury.restriction_notes ?? "");
  const canSaveNotesOnly =
    NOTES_ONLY_SAVE_STATUSES.has(injury.status) && notesChanged;

  async function submitTransition(
    status: "cleared_with_restrictions" | "permanent" | "resolved",
  ) {
    setPending(true);
    setActionError(null);
    try {
      const updated = await client.injuries.updateStatus(injury.id, {
        status,
        restriction_notes: notesDraft.trim() ? notesDraft : null,
      });
      setPending(false);
      setConfirmResolveOpen(false);
      onUpdated(updated);
    } catch {
      setPending(false);
      setActionError("Couldn't update this injury. Please try again.");
    }
  }

  function handleTransitionClick(
    to: "cleared_with_restrictions" | "permanent" | "resolved",
  ) {
    if (to === "cleared_with_restrictions" && !notesDraft.trim()) {
      setNotesValidationError(
        "Add restriction notes describing what to avoid.",
      );
      return;
    }
    setNotesValidationError(null);
    if (to === "resolved") {
      setConfirmResolveOpen(true);
      return;
    }
    void submitTransition(to);
  }

  return (
    <>
      <SheetOverlay title={regionLabel(injury.body_region)} onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <RegionGlyph
                region={injury.body_region}
                size={26}
                tone={meta.color}
              />
              <span
                className="font-sans text-[16px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                {regionLabel(injury.body_region)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Icon size={14} color={meta.color} aria-hidden="true" />
              <span
                className="font-sans text-[12px] font-medium"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
            </div>
            <p
              className="mt-1 font-mono tabular-nums text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              {stalenessLabel(injury)} · Pain {injury.pain_level}/10
            </p>
          </div>

          {injury.requires_referral && (
            <div
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 font-sans text-[12px] font-semibold"
              style={{ background: "var(--red)", color: "var(--bg)" }}
            >
              <Siren size={14} aria-hidden="true" />
              Medical alert — clearance needed
            </div>
          )}

          {injury.notes && (
            <div>
              <p
                className="font-sans text-[11px] font-medium uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Original report notes
              </p>
              <p
                className="mt-1 font-sans text-[13px]"
                style={{ color: "var(--text)" }}
              >
                {injury.notes}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="restriction-notes"
                className="font-sans text-[11px] font-medium uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Restriction notes
              </label>
              <span
                className="font-mono tabular-nums text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                {notesDraft.length}/{NOTES_MAX}
              </span>
            </div>
            <textarea
              id="restriction-notes"
              value={notesDraft}
              disabled={!notesEditable || pending}
              maxLength={NOTES_MAX}
              onChange={(e) => {
                setNotesDraft(e.target.value);
                if (e.target.value.trim()) setNotesValidationError(null);
              }}
              rows={3}
              placeholder="e.g. no overhead pressing, avoid full-depth squats"
              className="mt-1 w-full rounded-[8px] px-3 py-2 font-sans text-[13px]"
              style={{
                background: "var(--surface)",
                border: `1px solid ${
                  notesValidationError ? "var(--red)" : "var(--border)"
                }`,
                color: "var(--text)",
              }}
            />
            {notesValidationError && (
              <p
                className="mt-1 font-sans text-[12px]"
                style={{ color: "var(--red)" }}
              >
                {notesValidationError}
              </p>
            )}
            {injury.status === "active" && (
              <p
                className="mt-1 font-sans text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                Notes are saved when you choose a status below.
              </p>
            )}
          </div>

          {actionError && (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {actionError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {canSaveNotesOnly && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  void submitTransition(
                    injury.status as "cleared_with_restrictions" | "permanent",
                  )
                }
                className="flex h-11 items-center justify-center rounded-[8px] px-4 font-sans text-[13px] font-semibold"
                style={{
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  opacity: pending ? 0.7 : 1,
                }}
              >
                {pending ? "Saving…" : "Save notes"}
              </button>
            )}

            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                disabled={pending}
                onClick={() => handleTransitionClick(t.to)}
                className="flex h-11 items-center justify-center rounded-[8px] px-4 font-sans text-[13px] font-semibold"
                style={
                  t.to === "resolved"
                    ? {
                        background: "var(--green)",
                        color: "var(--bg)",
                        opacity: pending ? 0.7 : 1,
                      }
                    : {
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        opacity: pending ? 0.7 : 1,
                      }
                }
              >
                {t.label}
              </button>
            ))}

            {transitions.length === 0 && injury.status === "permanent" && (
              <p
                className="font-sans text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                Permanent injuries stay in effect — only restriction notes can
                be updated.
              </p>
            )}
          </div>
        </div>
      </SheetOverlay>

      {/* Rendered as a SIBLING of the outer SheetOverlay, not nested inside its
          children — the outer panel has an inline `transform` (for its
          open/close animation), which establishes a CSS containing block for
          `position: fixed` descendants, so a nested SheetOverlay's own `fixed
          inset-0` root would be clipped/positioned relative to the outer
          panel instead of covering the viewport. Siblings both get the real
          viewport as their containing block while still inheriting the page's
          forced-light theme tokens through the normal DOM cascade (unlike a
          document.body portal, which would escape that light subtree). */}
      {confirmResolveOpen && (
        <SheetOverlay
          title="Mark resolved?"
          onClose={() => (pending ? undefined : setConfirmResolveOpen(false))}
          maxHeight="46dvh"
        >
          <p
            className="mb-4 font-sans text-[14px]"
            style={{ color: "var(--text)" }}
          >
            {RESOLVE_CONFIRM_COPY}
          </p>
          {actionError && (
            <p
              className="mb-3 font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {actionError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmResolveOpen(false)}
              disabled={pending}
              className="flex h-11 flex-1 items-center justify-center rounded-[8px] font-sans text-[14px] font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitTransition("resolved")}
              disabled={pending}
              className="flex h-11 flex-1 items-center justify-center rounded-[8px] font-sans text-[14px] font-semibold"
              style={{
                background: "var(--green)",
                color: "var(--bg)",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "Resolving…" : "Mark resolved"}
            </button>
          </div>
        </SheetOverlay>
      )}
    </>
  );
}
