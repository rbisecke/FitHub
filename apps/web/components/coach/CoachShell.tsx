"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import { useCoachSessions } from "@/hooks/use-coach-sessions";
import { SessionListBody } from "@/components/coach/SessionListBody";
import { ChatThread } from "@/components/coach/ChatThread";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Responsive chat shell (design-spec 03 §1, §5) — the domain's one `md:`
 * breakpoint switch: a persistent ~280px left session-list rail alongside a
 * ~680px-capped, centered thread on desktop; stacked full-screen list ↔
 * thread views on mobile. Owns routing between `/coach` and
 * `/coach/[sessionId]` and the session list shared by both layouts.
 */
export function CoachShell({
  accessToken,
  sessionId,
  initialPrompt,
  modifyDeepLinkHref,
}: {
  accessToken: string;
  sessionId: string | null;
  initialPrompt?: string;
  modifyDeepLinkHref?: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const sessionsApi = useCoachSessions(accessToken);
  const [mobileShowThread, setMobileShowThread] = useState(sessionId !== null);
  const consumedPrompt = useRef(false);

  // /coach?prompt=… seeds the composer once, then the param is cleared (§6.4) —
  // the ChatThread below already captured it into its own state at mount time,
  // so clearing the URL here is safe and doesn't affect that copy.
  useEffect(() => {
    if (initialPrompt && !consumedPrompt.current) {
      consumedPrompt.current = true;
      router.replace("/coach");
    }
  }, [initialPrompt, router]);

  useEffect(() => {
    let cancelled = false;
    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect.
    void Promise.resolve().then(() => {
      if (!cancelled) setMobileShowThread(sessionId !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleSelect = useCallback(
    (id: string) => {
      setMobileShowThread(true);
      router.push(`/coach/${id}`);
    },
    [router],
  );

  const handleNew = useCallback(() => {
    setMobileShowThread(true);
    if (sessionId !== null) router.push("/coach");
  }, [router, sessionId]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const client = createApiClient(accessToken);
        await client.coach.sessions.del(id);
        sessionsApi.removeSession(id);
        if (id === sessionId) router.push("/coach");
      } catch {
        // Best-effort — the row simply stays if the delete call fails; the
        // user can retry from the overflow menu again.
      }
    },
    [accessToken, sessionId, sessionsApi, router],
  );

  const handleSessionResolved = useCallback(
    (newId: string) => {
      sessionsApi.prependNewSession({
        id: newId,
        title: "",
        created_at: new Date().toISOString(),
      });
      sessionsApi.refresh();
      if (sessionId === null) router.replace(`/coach/${newId}`);
    },
    [sessionsApi, sessionId, router],
  );

  const isBrandNewUser =
    !sessionsApi.loading && sessionsApi.sessions.length === 0;

  const listBody = (
    <SessionListBody
      sessions={sessionsApi.sessions}
      activeId={sessionId}
      loading={sessionsApi.loading}
      error={sessionsApi.error}
      hasMore={sessionsApi.hasMore}
      loadingMore={sessionsApi.loadingMore}
      onLoadMore={sessionsApi.loadMore}
      onSelect={handleSelect}
      onNew={handleNew}
      onDelete={(id) => void handleDelete(id)}
    />
  );

  const thread = (
    <ChatThread
      key={sessionId ?? "new"}
      accessToken={accessToken}
      sessionId={sessionId}
      initialComposerValue={initialPrompt ?? ""}
      isBrandNewUser={isBrandNewUser}
      onSessionResolved={handleSessionResolved}
      onTurnSettled={sessionsApi.refresh}
      modifyDeepLinkHref={modifyDeepLinkHref}
    />
  );

  if (isMobile) {
    return (
      // Bounded to the viewport minus the shell's own chrome so the composer
      // stays pinned and the thread scrolls internally instead of the page:
      // mobile top bar (mobile-top-bar.tsx, h-12/48px) + bottom tab bar
      // (mobile-bottom-nav.tsx, h-16/64px) + the pb-nav-safe breathing room
      // (globals.css, 16px) + the safe-area inset.
      <div className="flex h-[calc(100svh-48px-64px-16px-env(safe-area-inset-bottom))] flex-col">
        {mobileShowThread ? (
          <>
            <div
              className="flex items-center gap-2 border-b px-4 py-2"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() => {
                  setMobileShowThread(false);
                  router.push("/coach");
                }}
                aria-label="Back to conversations"
                data-testid="coach-back-to-list"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--text)]"
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <span className="font-sans text-sm font-medium text-[var(--text)]">
                Coach
              </span>
            </div>
            <div className="min-h-0 flex-1">{thread}</div>
          </>
        ) : (
          <div className="min-h-0 flex-1 px-4 py-4">{listBody}</div>
        )}
      </div>
    );
  }

  return (
    // Desktop: only the h-12/48px shell-top-bar to subtract — no bottom nav.
    <div className="flex h-[calc(100svh-48px)]">
      <div
        className="w-[280px] shrink-0 border-r px-3 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        {listBody}
      </div>
      <div className="flex flex-1 justify-center overflow-hidden">
        <div className="min-h-0 w-full max-w-[680px]">{thread}</div>
      </div>
    </div>
  );
}
