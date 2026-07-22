"use client";

import { useState } from "react";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { finalizeSummary } from "@/lib/team-sessions/leaderboard";
import type { TeamSessionParticipant } from "@/lib/api";

/**
 * Finalize / Reopen confirm (06 §6) — the one first-principles lifecycle
 * moment in this domain. Both actions are just `PATCH .../status`; the
 * dialog's only job is surfacing the real completion state before the
 * creator commits, per the shared confirm-dialog pattern (§4d): title states
 * the action, body contextualizes consequence, Confirm is labeled by verb.
 *
 * "Nudge" gap (§6 step 2): the spec calls for a nudge option that re-sends
 * `workout_link_pending` to an unlinked registered participant, but
 * `patch_participant` (the only mutation on an existing participant row)
 * fires no notification when only `role` or no field changes — there is no
 * backend mechanism to re-trigger that notification today. Rather than fake
 * a button that does nothing, this surfaces that gap as a plain note when
 * it's relevant (a registered, non-guest participant is unlinked) instead of
 * silently omitting it.
 */
export function FinalizeSheet({
  mode,
  notYetLogged,
  loggedCount,
  totalCount,
  onConfirm,
  onClose,
}: {
  mode: "finalize" | "reopen";
  notYetLogged: TeamSessionParticipant[];
  loggedCount: number;
  totalCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setPending(false);
      setError("Something went wrong. Please try again.");
      return;
    }
    setPending(false);
  }

  if (mode === "reopen") {
    return (
      <SheetOverlay
        title="Reopen this session?"
        onClose={() => (pending ? undefined : onClose())}
        maxHeight="36dvh"
      >
        <p
          className="mb-4 font-sans text-[14px]"
          style={{ color: "var(--text)" }}
        >
          The podium returns to provisional.
        </p>
        {error && (
          <p
            className="mb-3 font-sans text-[13px]"
            style={{ color: "var(--red)" }}
          >
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={pending}
            className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Reopening…" : "Reopen"}
          </button>
        </div>
      </SheetOverlay>
    );
  }

  const { allLogged, noneLogged } = finalizeSummary(loggedCount, totalCount);
  const firstUnlinked = notYetLogged[0];
  const unlinkedRegisteredExists = notYetLogged.some((p) => p.user_id != null);

  let body: string;
  if (noneLogged) {
    body = "No results are linked yet; the final board will be empty.";
  } else if (allLogged) {
    body = `All ${totalCount} have logged — finalize?`;
  } else {
    const name =
      firstUnlinked?.display_name || firstUnlinked?.guest_name || "One person";
    body = `${loggedCount} of ${totalCount} have logged. ${name} hasn't linked a result. Finalize anyway?`;
  }

  return (
    <SheetOverlay
      title="Finalize results?"
      onClose={() => (pending ? undefined : onClose())}
      maxHeight="42dvh"
    >
      <p
        className="mb-2 font-sans text-[14px]"
        style={{ color: "var(--text)" }}
      >
        {body}
      </p>
      {!allLogged && !noneLogged && unlinkedRegisteredExists && (
        <p
          className="mb-4 font-sans text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          There&apos;s no way to re-notify them yet — ask them directly, or
          finalize/wait.
        </p>
      )}
      {error && (
        <p
          className="mb-3 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Wait
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={pending}
          className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Finalizing…" : "Finalize now"}
        </button>
      </div>
    </SheetOverlay>
  );
}
