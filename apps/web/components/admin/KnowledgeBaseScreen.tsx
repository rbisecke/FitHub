"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { api } from "@/lib/api/client";
import type { AdminKBEntry, AdminReindexJob } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The manual command an operator must run themselves — the backend's
// trigger-reindex response also states this in its `message`, but rendering
// it as its own code block (rather than only as inline prose) is what makes
// the "this is not a real job queue" honesty requirement (`08` §10, FR §5.5)
// legible at a glance.
const REINDEX_COMMAND = "uv run python -m app.ai.ingest";

// Renders the backend's verbatim `message` field, but with any
// backtick-quoted command styled as an inline code chip instead of literal
// backtick characters — this is the ONLY place the command appears in the
// triggered state (a dedicated second code block directly below it read as
// pure duplication in review), while still surfacing the API's own text
// unaltered, not a paraphrase.
function renderMessageWithInlineCode(message: string) {
  const segments = message.split(/(`[^`]*`)/g).filter((s) => s.length > 0);
  return segments.map((segment, i) => {
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-[var(--text)]"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{segment}</span>;
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 1500);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleCopy}
      aria-label="Copy command to clipboard"
    >
      {copied ? (
        <Check size={13} aria-hidden="true" />
      ) : (
        <Copy size={13} aria-hidden="true" />
      )}
      {copyError && <span className="sr-only">Copy failed</span>}
    </Button>
  );
}

/**
 * Knowledge base (`08` §10). Server-fetched first paint (see
 * `app/admin/knowledge-base/page.tsx`); this client component owns
 * the client-side retry path plus the reindex dialog.
 *
 * Honesty is the explicit design requirement (FR §5.5): the reindex "job" is
 * a fabrication (a fresh `job_id`, status `"queued"`, and an instruction to
 * run a CLI command manually) and the status endpoint always answers
 * `"unknown"` / "not yet implemented". Neither state is rendered as a
 * progress bar or a spinner — both are shown as plain operator text.
 */
export function KnowledgeBaseScreen({
  token,
  initialEntries,
  initialLoadFailed,
}: {
  token: string;
  initialEntries: AdminKBEntry[] | null;
  initialLoadFailed: boolean;
}) {
  const [entries, setEntries] = useState<AdminKBEntry[]>(initialEntries ?? []);
  const [loading, setLoading] = useState(
    initialEntries === null && !initialLoadFailed,
  );
  const [error, setError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reindexPending, setReindexPending] = useState(false);
  const [reindexJob, setReindexJob] = useState<AdminReindexJob | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [statusResult, setStatusResult] = useState<AdminReindexJob | null>(
    null,
  );
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEntries !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    api.admin
      .knowledgeBase(token, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
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

  function handleRetry() {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  function openDialog() {
    setReindexJob(null);
    setReindexError(null);
    setStatusResult(null);
    setStatusError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (reindexPending || statusPending) return;
    setDialogOpen(false);
  }

  async function handleTriggerReindex() {
    if (reindexPending) return;
    setReindexPending(true);
    setReindexError(null);
    try {
      const job = await api.admin.triggerReindex(token);
      setReindexJob(job);
    } catch {
      setReindexError("Couldn't reach the reindex endpoint. Please try again.");
    } finally {
      setReindexPending(false);
    }
  }

  async function handleCheckStatus() {
    if (!reindexJob || statusPending) return;
    setStatusPending(true);
    setStatusError(null);
    try {
      const result = await api.admin.reindexStatus(token, reindexJob.job_id);
      setStatusResult(result);
    } catch {
      setStatusError("Couldn't reach the status endpoint. Please try again.");
    } finally {
      setStatusPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-[var(--text)]">Knowledge base</h1>
          <p className="type-small text-[var(--muted)]">
            RAG corpus backing the AI coach, grouped by source. Indexing time
            isn&apos;t tracked for any source.
          </p>
        </div>
        <Button type="button" onClick={openDialog} className="shrink-0">
          Reindex
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[64px] w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <p className="text-sm text-[var(--red)]">
            Couldn&apos;t load the knowledge base. Please try again.
          </p>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--muted)]">
          No indexed sources yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <span className="truncate font-mono text-sm text-[var(--text)]">
                {entry.title ?? entry.source_type}
              </span>
              {/* Fixed min-width + right-aligned so counts form a scannable
                  column instead of ragged pill edges. */}
              <span className="min-w-[110px] shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1 text-right font-mono text-sm tabular-nums text-[var(--text)]">
                {entry.chunk_count.toLocaleString()} chunks
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reindex the knowledge base</DialogTitle>
            {!reindexJob && (
              <DialogDescription>
                This does not start a background job. It kicks off a manual
                process — you&apos;ll need to run the following command yourself
                once this dialog confirms it:
              </DialogDescription>
            )}
          </DialogHeader>

          {!reindexJob ? (
            <>
              <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                <code className="truncate font-mono text-xs text-[var(--text)]">
                  {REINDEX_COMMAND}
                </code>
                <CopyButton text={REINDEX_COMMAND} />
              </div>
              {reindexError && (
                <p role="alert" className="text-xs text-[var(--red)]">
                  {reindexError}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={reindexPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleTriggerReindex}
                  disabled={reindexPending}
                >
                  {reindexPending ? "Queuing…" : "Trigger reindex"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[var(--muted)]">
                    job {reindexJob.job_id}
                  </span>
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">
                    {reindexJob.status}
                  </span>
                </div>
                {/* Carries the pre-trigger dialog's "not a real job" framing
                    forward — without it, a job id + "queued" pill alone
                    reads exactly like a real tracked job once the disclaimer
                    screen is gone. */}
                <p className="text-[10px] uppercase tracking-[0.5px] text-[var(--muted)]">
                  Local placeholder — not tracked by a real job queue
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs text-[var(--text)]">
                    {renderMessageWithInlineCode(reindexJob.message)}
                  </p>
                  <CopyButton text={REINDEX_COMMAND} />
                </div>
              </div>

              {statusResult ? (
                <p className="text-xs text-[var(--muted)]">
                  Status tracking not available — check server logs.
                </p>
              ) : statusError ? (
                <p role="alert" className="text-xs text-[var(--red)]">
                  {statusError}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckStatus}
                  disabled={statusPending || statusResult !== null}
                >
                  {statusPending ? "Checking…" : "Check status"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
