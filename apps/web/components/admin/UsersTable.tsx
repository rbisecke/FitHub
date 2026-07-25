"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { identityColor } from "@fithub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import {
  MagicLinkModal,
  useMagicLinkFlow,
} from "@/components/admin/MagicLinkModal";
import { api, ApiError } from "@/lib/api/client";
import type { AdminUser } from "@/lib/api";

const ROW_CAP = 200;

type SortKey = "created_at" | "interactions_30d";
type SortDir = "asc" | "desc";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function userLabel(user: AdminUser): string {
  // 08 §6: the row label falls back display_name → raw user_id (email is
  // real now per BG-22 but is deliberately not part of this fallback chain —
  // it renders as a secondary line instead, see below).
  return user.display_name ?? user.user_id;
}

function isPendingOnboarding(user: AdminUser): boolean {
  return user.display_name === null && user.interactions_30d === 0;
}

function upstreamErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 502) {
    return "Auth service didn't respond — try again.";
  }
  return fallback;
}

function SortButton({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-pressed={isActive}
      className={`type-caption flex items-center gap-1 uppercase tracking-wide transition-colors ${
        align === "right" ? "w-full justify-end" : ""
      } ${
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {isActive ? (
        <span aria-hidden="true">{dir === "desc" ? "↓" : "↑"}</span>
      ) : null}
    </button>
  );
}

// Sessions (30d) gets a fixed width, not 1fr, so the numeric column lines up
// cleanly above the row-action "···" menu instead of stretching with the
// row's available width (UI review — numeric-surface right-align rule).
const GRID = "minmax(0,2fr) 1fr 6.5rem 3.25rem";

interface RowActionsProps {
  user: AdminUser;
  isBanned: boolean;
  onDisable: () => void;
  onDelete: () => void;
  onMagicLink: () => void;
}

function RowActions({
  user,
  isBanned,
  onDisable,
  onDelete,
  onMagicLink,
}: RowActionsProps) {
  const label = userLabel(user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${label}`}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled={isBanned} onClick={onDisable}>
          {isBanned ? "Banned" : "Disable"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMagicLink}>
          Generate magic link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Props {
  token: string;
  initialUsers: AdminUser[] | null;
  initialLoadFailed: boolean;
}

/**
 * User management table (`08` §6). Search + sort over the ≤200-row admin
 * user list, plus the three per-row overflow actions (disable / generate
 * magic link / delete). Desktop-only — the admin console gate (§4) already
 * enforces the ≥768px scope, so this renders a single layout, no responsive
 * branching.
 */
export function UsersTable({ token, initialUsers, initialLoadFailed }: Props) {
  const [data, setData] = useState<AdminUser[] | null>(initialUsers);
  const [loading, setLoading] = useState(
    initialUsers === null && !initialLoadFailed,
  );
  const [loadError, setLoadError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // The backend hardcodes `banned_until: null` in the list query (it never
  // reflects the ban immediately), so a successful disable is tracked here
  // client-side for the rest of the session rather than re-derived from data
  // that structurally can't show it.
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());

  const [disableTarget, setDisableTarget] = useState<AdminUser | null>(null);
  const [disableBusy, setDisableBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const magicLink = useMagicLinkFlow(token);

  useEffect(() => {
    if (data !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    api.admin
      .users(token, { signal: controller.signal })
      .then((users) => {
        if (cancelled) return;
        setData(users);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setLoadError(true);
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
    setLoadError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  const filtered = useMemo(() => {
    const users = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.display_name?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number;
      let bv: number;
      if (sortKey === "interactions_30d") {
        av = a.interactions_30d;
        bv = b.interactions_30d;
      } else {
        av = a.created_at ? new Date(a.created_at).getTime() : 0;
        bv = b.created_at ? new Date(b.created_at).getTime() : 0;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleDisable() {
    if (!disableTarget) return;
    setDisableBusy(true);
    try {
      await api.admin.disableUser(token, disableTarget.user_id);
      setBannedIds((prev) => new Set(prev).add(disableTarget.user_id));
      toast.success("User disabled");
      setDisableTarget(null);
    } catch (err) {
      toast.error(
        upstreamErrorMessage(
          err,
          "Couldn't disable this user. Please try again.",
        ),
      );
    } finally {
      setDisableBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.admin.deleteUser(token, deleteTarget.user_id);
      setData((prev) =>
        prev ? prev.filter((u) => u.user_id !== deleteTarget.user_id) : prev,
      );
      toast.success("User deleted");
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } catch (err) {
      toast.error(
        upstreamErrorMessage(
          err,
          "Couldn't delete this user. Please try again.",
        ),
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  // Spec fallback is display_name → email (§6); the raw user_id is a
  // defensive third tier for the rare case both are null.
  const deleteTargetLabel = deleteTarget
    ? deleteTarget.display_name ?? deleteTarget.email ?? deleteTarget.user_id
    : "";
  const deleteMatches =
    deleteTarget !== null && deleteConfirmText === deleteTargetLabel;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1 text-foreground">Users</h1>
          <p className="type-small mt-1 text-muted-foreground">
            Member accounts and account actions.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users by name or email"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)]">
        <div
          className="grid items-center gap-3 border-b border-border px-5 py-3"
          style={{ gridTemplateColumns: GRID }}
        >
          <span className="type-caption uppercase tracking-wide text-muted-foreground">
            Member
          </span>
          <SortButton
            label="Joined"
            sortKey="created_at"
            active={sortKey}
            dir={sortDir}
            onSort={handleSort}
          />
          <SortButton
            label="Sessions (30d)"
            sortKey="interactions_30d"
            active={sortKey}
            dir={sortDir}
            onSort={handleSort}
            align="right"
          />
          <span />
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="grid items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
                style={{ gridTemplateColumns: GRID }}
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-sm" />
                </div>
                <Skeleton className="h-4 w-16 rounded-sm" />
                <Skeleton className="ml-auto h-4 w-10 rounded-sm" />
                <span />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-start gap-2 px-5 py-8">
            <p className="type-small text-[var(--red)]">
              Couldn&apos;t load users. Please try again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-11 text-center">
            <p className="type-small text-muted-foreground">
              {search ? "No users match." : "No users found."}
            </p>
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          sorted.map((user) => {
            const label = userLabel(user);
            const banned = bannedIds.has(user.user_id);
            const pendingOnboarding = isPendingOnboarding(user);
            const primaryText = pendingOnboarding ? "Pending user" : label;
            const { cssVar } = identityColor(user.user_id);
            return (
              <div
                key={user.user_id}
                className={`grid items-center gap-3 border-b border-border px-5 py-3 transition-colors duration-[320ms] last:border-b-0 ${
                  banned ? "bg-[var(--red)]/10" : ""
                }`}
                style={{
                  gridTemplateColumns: GRID,
                  borderLeft: `3px solid ${banned ? "var(--red)" : cssVar}`,
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarMonogram name={label} seed={user.user_id} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-[13px] font-medium ${
                          pendingOnboarding
                            ? "text-muted-foreground italic"
                            : "text-foreground"
                        }`}
                      >
                        {primaryText}
                      </span>
                      {pendingOnboarding ? (
                        <Badge className="shrink-0 border-[var(--amber)]/40 bg-[var(--amber)]/15 text-[10px] text-[var(--amber)]">
                          Pending onboarding
                        </Badge>
                      ) : null}
                      {banned ? (
                        <Badge
                          variant="destructive"
                          className="shrink-0 text-[10px]"
                        >
                          Banned
                        </Badge>
                      ) : null}
                    </div>
                    {pendingOnboarding ? (
                      <span className="type-num-inline block truncate text-[11px] text-muted-foreground/70">
                        {user.user_id}
                      </span>
                    ) : user.email ? (
                      <span className="type-caption block truncate text-muted-foreground">
                        {user.email}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="type-num-inline text-muted-foreground">
                  {formatDate(user.created_at)}
                </span>
                <span className="type-num-inline text-right text-muted-foreground">
                  {user.interactions_30d.toLocaleString()}
                </span>
                <RowActions
                  user={user}
                  isBanned={banned}
                  onDisable={() => setDisableTarget(user)}
                  onDelete={() => setDeleteTarget(user)}
                  onMagicLink={() => magicLink.generate(user.user_id, label)}
                />
              </div>
            );
          })
        )}
      </div>

      {!loading && !loadError && data && data.length >= ROW_CAP ? (
        <p className="type-caption mt-3 text-muted-foreground">
          Showing first {ROW_CAP} users.
        </p>
      ) : null}

      <AlertDialog
        open={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable this user?</AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be able to sign in until re-enabled. This does not
              delete their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disableBusy}
              onClick={() => void handleDisable()}
            >
              {disableBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes their account and all associated data —
              workouts, plans, injury records, everything. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/*
            Cross-domain active-team-session warning (08 §6, "Active
            team-session warning") is intentionally NOT implemented: no
            endpoint today can answer "is this user currently in an active
            team session" for an arbitrary user_id — `GET /team-sessions`
            (apps/api/app/routers/team_sessions.py) is scoped to the calling
            user only, and there's no admin-wide participant lookup. Flagged
            here and in the PR/handover notes as a documented gap rather than
            a fabricated always-false check.
          */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="delete-confirm-input"
              className="type-caption text-muted-foreground"
            >
              Type{" "}
              <span className="type-num-inline font-semibold text-foreground">
                {deleteTargetLabel}
              </span>{" "}
              to confirm
            </label>
            <Input
              id="delete-confirm-input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteBusy || !deleteMatches}
              onClick={() => void handleDelete()}
            >
              {deleteBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MagicLinkModal
        state={magicLink.state}
        onOpenChange={magicLink.onOpenChange}
        onRetry={magicLink.retry}
      />
    </div>
  );
}
