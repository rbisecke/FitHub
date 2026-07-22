"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api/client";

interface MagicLinkFlowState {
  open: boolean;
  loading: boolean;
  link: string | null;
  error: string | null;
  label: string;
  userId: string | null;
}

const INITIAL_STATE: MagicLinkFlowState = {
  open: false,
  loading: false,
  link: null,
  error: null,
  label: "",
  userId: null,
};

/**
 * Shared "generate magic link" flow (`08` §5's approved-row "Copy magic
 * link" shortcut and §6's users-table overflow action reuse the identical
 * fetch + reveal-and-copy dialog, not two divergent implementations).
 *
 * The fetch is triggered imperatively from `generate()` — called out of a
 * click handler at each call site — rather than from a `useEffect` keyed on
 * `open`. `api.admin.generateMagicLink` has no `signal` param to forward (it's
 * a one-shot POST action, not a listing fetch), so the project's mandatory
 * "every effect fetch needs AbortController" rule doesn't apply here; this
 * follows the "async event handler needs try/catch + user feedback" rule
 * instead.
 */
export function useMagicLinkFlow(token: string) {
  const [state, setState] = useState<MagicLinkFlowState>(INITIAL_STATE);

  const generate = useCallback(
    async (userId: string, label: string) => {
      setState({
        open: true,
        loading: true,
        link: null,
        error: null,
        label,
        userId,
      });
      try {
        const res = await api.admin.generateMagicLink(token, userId);
        setState((s) =>
          s.userId === userId ? { ...s, loading: false, link: res.link } : s,
        );
      } catch (err) {
        const message =
          err instanceof ApiError && err.status === 502
            ? "Auth service didn't respond — try again."
            : "Couldn't generate a magic link. Please try again.";
        setState((s) =>
          s.userId === userId ? { ...s, loading: false, error: message } : s,
        );
      }
    },
    [token],
  );

  const onOpenChange = useCallback((open: boolean) => {
    setState((s) => ({ ...s, open }));
  }, []);

  const retry = useCallback(() => {
    setState((s) => {
      if (s.userId) void generate(s.userId, s.label);
      return s;
    });
  }, [generate]);

  return { state, generate, onOpenChange, retry };
}

export function MagicLinkModal({
  state,
  onOpenChange,
  onRetry,
}: {
  state: MagicLinkFlowState;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  async function handleCopy() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      toast.success("Magic link copied");
    } catch {
      toast.error(
        "Couldn't copy automatically — select and copy the link manually.",
      );
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-[var(--surface-3)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Magic link {state.label ? `for ${state.label}` : ""}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            One-time sign-in link. Anyone holding this link can sign in as this
            user — hand it off out of band, only to them.
          </DialogDescription>
        </DialogHeader>

        {state.loading ? (
          <Skeleton className="h-9 w-full rounded-lg" />
        ) : state.error ? (
          <p className="type-small text-[var(--red)]">{state.error}</p>
        ) : state.link ? (
          <div className="flex items-center gap-2">
            <code className="type-num-inline flex-1 truncate rounded-lg border border-border bg-[var(--surface)] px-2.5 py-1.5 text-foreground">
              {state.link}
            </code>
            <Button type="button" size="sm" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        ) : null}

        {state.error ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="button" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
