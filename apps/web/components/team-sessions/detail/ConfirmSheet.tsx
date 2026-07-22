"use client";

import { useState } from "react";
import { SheetOverlay } from "@/components/logging/SheetOverlay";

/**
 * The shared confirm-dialog pattern (06 §4d) used for every destructive or
 * state-changing confirmation in this domain: remove/leave/delete-session
 * (§4d), and — via the same shape — finalize/reopen (§6). Title states the
 * action, body contextualizes the consequence, and the confirm button is
 * always labeled with the verb, never "OK".
 */
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
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

  return (
    <SheetOverlay
      title={title}
      onClose={() => (pending ? undefined : onClose())}
      maxHeight="40dvh"
    >
      <p
        className="mb-4 font-sans text-[14px]"
        style={{ color: "var(--text)" }}
      >
        {body}
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
            background: destructive ? "var(--red)" : "var(--accent)",
            color: "var(--bg)",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? `${confirmLabel}…` : confirmLabel}
        </button>
      </div>
    </SheetOverlay>
  );
}
