"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import type { AdminInvitedEmail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_ITEMS = 500;
// How long the "just added" success fill stays on a fresh row before it
// settles into its normal (unused) treatment.
const ADD_HIGHLIGHT_MS = 1600;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Invite allowlist management (`08` §9). Server-fetched first paint (see
 * `app/(shell)/admin/allowlist/page.tsx`); this client component owns the
 * client-side retry path, the inline add form, and the confirmed-remove
 * flow — the highest-consequence, least-obvious action in the admin domain,
 * since removing an already-used email 403s that user out of the whole API
 * on their next request even though their Supabase account still exists.
 */
export function AllowlistScreen({
  token,
  initialEmails,
  initialLoadFailed,
}: {
  token: string;
  initialEmails: AdminInvitedEmail[] | null;
  initialLoadFailed: boolean;
}) {
  const [emails, setEmails] = useState<AdminInvitedEmail[]>(
    initialEmails ?? [],
  );
  // Starts "loading" only when there's no SSR-provided first paint and the
  // SSR fetch didn't already fail — retries set it from the click handler,
  // never imperatively inside the effect below.
  const [loading, setLoading] = useState(
    initialEmails === null && !initialLoadFailed,
  );
  const [error, setError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);

  const [addValue, setAddValue] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<AdminInvitedEmail | null>(
    null,
  );
  const [removePending, setRemovePending] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (initialEmails !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    api.admin
      .invitedEmails(token, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setEmails(data);
        setError(false);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setError(true);
        setLoading(false);
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, token]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  function handleRetry() {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = addValue.trim();
    if (!email || addPending) return;
    setAddPending(true);
    setAddError(null);
    try {
      const created = await api.admin.addInvitedEmail(token, email);
      setEmails((prev) => [created, ...prev].slice(0, MAX_ITEMS));
      setAddValue("");
      setJustAddedId(created.id);
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => {
        setJustAddedId(null);
      }, ADD_HIGHLIGHT_MS);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAddError("That email is already on the list.");
      } else if (err instanceof ApiError && err.status === 422) {
        setAddError("Enter a valid email address.");
      } else {
        setAddError("Something went wrong. Please try again.");
      }
    } finally {
      setAddPending(false);
    }
  }

  function openRemoveDialog(row: AdminInvitedEmail) {
    setRemoveError(null);
    setRemoveTarget(row);
  }

  function closeRemoveDialog() {
    if (removePending) return;
    setRemoveTarget(null);
    setRemoveError(null);
  }

  async function handleConfirmRemove() {
    if (!removeTarget || removePending) return;
    setRemovePending(true);
    setRemoveError(null);
    try {
      await api.admin.removeInvitedEmail(token, removeTarget.email);
      setEmails((prev) => prev.filter((e) => e.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setRemoveError("No matching email.");
        // Already gone server-side — drop the stale row locally too.
        setEmails((prev) => prev.filter((e) => e.id !== removeTarget.id));
      } else {
        setRemoveError("Something went wrong. Please try again.");
      }
    } finally {
      setRemovePending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="type-h1 text-[var(--text)]">Invite allowlist</h1>
        <p className="type-small text-[var(--muted)]">
          Direct CRUD over <code className="font-mono">invited_emails</code> —
          up to 500 entries, most recent first.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            type="email"
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="name@example.com"
            aria-label="Email to add to the allowlist"
            disabled={addPending}
          />
          {addError && (
            <p
              role="alert"
              className="mt-1.5 font-mono text-xs text-[var(--red)]"
            >
              {addError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={addPending || !addValue.trim()}>
          {addPending ? "Adding…" : "Add email"}
        </Button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[64px] w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <p className="text-sm text-[var(--red)]">
            Couldn&apos;t load the allowlist. Please try again.
          </p>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--muted)]">
          No invites yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {emails.map((row) => {
            const consumed = row.used_at !== null;
            const justAdded = row.id === justAddedId;
            return (
              <li
                key={row.id}
                // Steady-state rows share one plain surface regardless of
                // used/unused — a full-row color fill for "consumed"
                // double-encoded the status (badge + row) and borrowed
                // --green, the reserved positive/achievement token, for what
                // is really just closed, inert metadata. The transient
                // "just added" success fill (a real success event) is the
                // only fill left.
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors duration-700 ${
                  justAdded
                    ? "border-[var(--green)]/50 bg-[var(--green)]/15"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-mono text-sm text-[var(--text)]">
                    {row.email}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
                    invited {formatDateTime(row.invited_at)}
                    {consumed &&
                      ` · used ${formatDateTime(row.used_at as string)}`}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {/* Unused (still open, operator-relevant) carries the
                      visual weight; consumed is closed/inert and stays
                      quiet — the inverse of a success-badge reading. */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] ${
                      consumed
                        ? "border-[var(--border)] text-[var(--muted)]"
                        : "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
                    }`}
                  >
                    {consumed ? "Consumed" : "Unused"}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => openRemoveDialog(row)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeRemoveDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove this email from the allowlist?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This email has already been used to create an account. Removing it
              here does not delete that account, but blocks any future re-invite
              to this address without adding it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeError && (
            <p role="alert" className="text-xs text-[var(--red)]">
              {removeError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removePending}
              onClick={handleConfirmRemove}
            >
              {removePending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
