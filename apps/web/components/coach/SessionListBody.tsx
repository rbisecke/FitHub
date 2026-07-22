"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { groupSessionsByRecency } from "@/lib/coach/recency-groups";
import type { CoachSession } from "@/lib/api";

/**
 * Shared session-list rendering (design-spec 03 §5) used both as the desktop
 * left rail and the mobile full-screen list — same recency-grouped rows,
 * persistent "New conversation" entry, delete-only overflow (rename declined,
 * 2026-07-18).
 */
export function SessionListBody({
  sessions,
  activeId,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
  onNew,
  onDelete,
}: {
  sessions: CoachSession[];
  activeId: string | null;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const groups = groupSessionsByRecency(sessions);

  return (
    <div
      className="flex h-full flex-col gap-3"
      data-testid="coach-session-list"
    >
      <button
        type="button"
        onClick={onNew}
        data-testid="coach-new-conversation"
        className="flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 font-sans text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        <Plus size={16} aria-hidden="true" />
        New conversation
      </button>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {loading && (
          <div
            className="flex flex-col gap-2"
            data-testid="coach-session-list-skeleton"
          >
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        )}

        {!loading && error && (
          <p className="font-sans text-sm" style={{ color: "var(--muted)" }}>
            Couldn&apos;t load your conversations.
          </p>
        )}

        {!loading && !error && sessions.length === 0 && (
          <p
            className="font-sans text-sm"
            style={{ color: "var(--muted)" }}
            data-testid="coach-session-list-empty"
          >
            No conversations yet — start one above.
          </p>
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <div key={group.bucket} className="flex flex-col gap-1">
              <p
                className="px-1 font-mono text-[11px] tracking-wide uppercase"
                style={{ color: "var(--muted)" }}
              >
                {group.bucket}
              </p>
              {group.sessions.map((session) => (
                <div
                  key={session.id}
                  className="group/row flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    data-testid={`coach-session-row-${session.id}`}
                    aria-current={activeId === session.id ? "true" : undefined}
                    className="min-h-11 flex-1 truncate rounded-lg px-3 py-2 text-left font-sans text-[13px] transition-colors"
                    style={{
                      color:
                        activeId === session.id
                          ? "var(--accent)"
                          : "var(--text)",
                      background:
                        activeId === session.id
                          ? "var(--surface)"
                          : "transparent",
                    }}
                  >
                    {session.title || "Untitled conversation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(session.id)}
                    aria-label="Delete conversation"
                    data-testid={`coach-session-delete-${session.id}`}
                    className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:text-[var(--red)]"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ))}

        {!loading && !error && hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            data-testid="coach-session-load-more"
            className="w-fit font-sans text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            {loadingMore ? "Loading…" : "Load older conversations"}
          </button>
        )}
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="coach-session-delete-confirm"
              onClick={() => {
                if (pendingDeleteId) onDelete(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
