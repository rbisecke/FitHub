"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MagicLinkModal,
  useMagicLinkFlow,
} from "@/components/admin/MagicLinkModal";
import { api, ApiError } from "@/lib/api/client";
import type { AdminAccessRequest, AdminUser } from "@/lib/api";

type Tab = "pending" | "approved" | "rejected";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Full-surface fill applied on a real approve/reject transition (`08` §5,
 * flow-research rec 3 — gated to the actual state change, never a flash on a
 * poll tick). */
function flashClass(flash: "approved" | "rejected" | null) {
  if (flash === "approved")
    return "bg-[var(--green)]/15 border-[var(--green)]/50";
  if (flash === "rejected") return "bg-[var(--red)]/12 border-[var(--red)]/40";
  return "border-border bg-[var(--surface)]";
}

interface RowProps {
  request: AdminAccessRequest;
  token: string;
  resolvedUserId: string | null;
  onSettled: (updated: AdminAccessRequest) => void;
  onRefreshAll: () => void;
  onOpenMagicLink: (userId: string, label: string) => void;
}

function RequestRow({
  request,
  token,
  resolvedUserId,
  onSettled,
  onRefreshAll,
  onOpenMagicLink,
}: RowProps) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [flash, setFlash] = useState<"approved" | "rejected" | null>(null);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [alreadyHandled, setAlreadyHandled] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function settleAfterFlash(
    action: "approved" | "rejected",
    updated: AdminAccessRequest,
  ) {
    setFlash(action);
    window.setTimeout(() => onSettled(updated), 480);
  }

  async function runAction(action: "approved" | "rejected", note?: string) {
    setActionError(null);
    setBusy(action === "approved" ? "approve" : "reject");
    try {
      const updated = await api.admin.reviewAccessRequest(
        token,
        request.id,
        action,
        note,
      );
      settleAfterFlash(action, updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setAlreadyHandled(true);
        setBusy(null);
        return;
      }
      // The round trip failed (network blip, 502 invite-send error, etc.) —
      // we can't tell from here whether the DB write committed before the
      // failure, so reconcile against the server's truth rather than assume
      // either outcome.
      try {
        const fresh = await api.admin.accessRequests(token);
        const match = fresh.find((r) => r.id === request.id);
        if (match && match.status !== "pending") {
          settleAfterFlash(
            match.status === "approved" ? "approved" : "rejected",
            match,
          );
          return;
        }
      } catch {
        // fall through to the generic error below
      }
      setBusy(null);
      setActionError("Action failed. Please try again.");
    }
  }

  if (alreadyHandled) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[var(--surface)] px-4 py-3">
        <p className="type-small text-muted-foreground">
          This request was already handled.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefreshAll}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>
    );
  }

  const pending = request.status === "pending";

  return (
    <div
      className={`rounded-lg border p-4 transition-colors duration-[320ms] ease-[var(--ease-standard)] ${flashClass(
        flash,
      )}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-small font-semibold text-foreground">
              {request.email}
            </span>
            {request.name ? (
              <span className="type-caption text-muted-foreground">
                ({request.name})
              </span>
            ) : null}
          </div>
          {request.motivation ? (
            <p className="type-small mt-1.5 text-muted-foreground italic">
              &ldquo;{request.motivation}&rdquo;
            </p>
          ) : (
            <p className="type-small mt-1.5 text-muted-foreground/60 italic">
              No message provided.
            </p>
          )}
          <div className="type-num-inline mt-2 text-[11px] text-muted-foreground">
            Requested {formatDate(request.created_at)}
            {request.reviewed_at
              ? ` · Reviewed ${formatDate(request.reviewed_at)}`
              : ""}
          </div>
        </div>

        {pending ? (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => setShowRejectNote((v) => !v)}
            >
              {busy === "reject" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <X className="size-3.5" aria-hidden="true" />
              )}
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runAction("approved")}
            >
              {busy === "approve" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-3.5" aria-hidden="true" />
              )}
              Approve
            </Button>
          </div>
        ) : request.status === "approved" ? (
          <Badge className="border-[var(--green)]/40 bg-[var(--green)]/15 text-[var(--green)]">
            Approved
          </Badge>
        ) : (
          <Badge className="border-[var(--red)]/35 bg-[var(--red)]/12 text-[var(--red)]">
            Rejected
          </Badge>
        )}
      </div>

      {pending && showRejectNote ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Optional note for the record (not sent to the requester)"
            maxLength={1000}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRejectNote(false);
                setRejectNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                void runAction("rejected", rejectNote.trim() || undefined)
              }
            >
              {busy === "reject" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Confirm reject
            </Button>
          </div>
        </div>
      ) : null}

      {request.status === "approved" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-[var(--surface)]/60 px-3 py-2">
          <span className="type-caption text-muted-foreground">
            Invite email status unconfirmed — they can still sign in.
          </span>
          {resolvedUserId ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onOpenMagicLink(resolvedUserId, request.email)}
            >
              Copy magic link
            </Button>
          ) : (
            <span className="type-caption text-[var(--amber)] italic">
              Magic link unavailable — no matching signed-in account yet
            </span>
          )}
        </div>
      ) : null}

      {actionError ? (
        <p className="type-caption mt-2 text-[var(--red)]">{actionError}</p>
      ) : null}
    </div>
  );
}

interface Props {
  initial: AdminAccessRequest[];
  users: AdminUser[];
  token: string;
}

/**
 * Access requests queue (`08` §5). Pending/Approved/Rejected tabs with live
 * counts; pending is the default and only actionable tab.
 *
 * `users` resolves the approved-row "Copy magic link" shortcut: `AccessRequestRow`
 * carries no `user_id` (FR §4.2's shape), so we cross-reference the approved
 * request's email against the admin users list (email is now populated for
 * real per BG-22) to find the underlying account. When no match exists yet
 * (the person hasn't completed sign-in since being invited), the shortcut is
 * disabled with an explanatory note rather than fabricated.
 */
export function AccessRequestsPanel({ initial, users, token }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<AdminAccessRequest[]>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const magicLink = useMagicLinkFlow(token);

  const emailToUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.email) map.set(u.email.trim().toLowerCase(), u.user_id);
    }
    return map;
  }, [users]);

  const counts: Record<Tab, number> = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const filtered = requests.filter((r) => r.status === activeTab);

  function handleSettled(updated: AdminAccessRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function refreshAll() {
    setRefreshing(true);
    try {
      const fresh = await api.admin.accessRequests(token);
      setRequests(fresh);
    } catch {
      // Best-effort — the row stays in its "already handled" state and the
      // admin can retry the refresh.
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5">
        <h1 className="type-h1 text-foreground">Access requests</h1>
        <p className="type-small mt-1 text-muted-foreground">
          Review requests for invite-only access. Approving allowlists the email
          and sends an invite; rejecting dismisses it.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="gap-1.5 data-active:bg-[var(--accent)]/15 data-active:text-[var(--accent)] dark:data-active:border-[var(--accent)]/40 dark:data-active:bg-[var(--accent)]/15 dark:data-active:text-[var(--accent)]"
            >
              <span className="capitalize">{tab}</span>
              <Badge
                variant="secondary"
                className="type-num-inline text-[10px]"
              >
                {counts[tab]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {(["pending", "approved", "rejected"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {tab === activeTab && filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-[var(--surface)] px-8 py-11 text-center">
                <p className="type-small text-muted-foreground">
                  {tab === "pending"
                    ? "No requests waiting."
                    : `No ${tab} requests.`}
                </p>
              </div>
            ) : tab === activeTab ? (
              <div className="flex flex-col gap-3">
                {filtered.map((req) => (
                  <RequestRow
                    key={req.id}
                    request={req}
                    token={token}
                    resolvedUserId={
                      emailToUserId.get(req.email.trim().toLowerCase()) ?? null
                    }
                    onSettled={handleSettled}
                    onRefreshAll={() => void refreshAll()}
                    onOpenMagicLink={(userId, label) =>
                      magicLink.generate(userId, label)
                    }
                  />
                ))}
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>

      {refreshing ? (
        <p className="type-caption mt-3 text-muted-foreground">Refreshing…</p>
      ) : null}

      <MagicLinkModal
        state={magicLink.state}
        onOpenChange={magicLink.onOpenChange}
        onRetry={magicLink.retry}
      />
    </div>
  );
}
