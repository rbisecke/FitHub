"use client";

import { useEffect, useRef, useState } from "react";
import { createApiClient } from "@/lib/api/client";
import type { HistoryMessage } from "@/lib/api";
import { useChatStream, type ChatCitation } from "@/hooks/use-chat-stream";
import { UserBubble } from "@/components/coach/UserBubble";
import { AssistantMessage } from "@/components/coach/AssistantMessage";
import { SafetyStopNotice } from "@/components/coach/SafetyStopNotice";
import { StarterPrompts } from "@/components/coach/StarterPrompts";
import { ChatComposer } from "@/components/coach/ChatComposer";
import {
  ChatErrorBanner,
  KillSwitchBanner,
  RateLimitedNotice,
} from "@/components/coach/ChatErrorBanner";
import {
  ConsentInterstitial,
  hasSeenCoachConsent,
} from "@/components/coach/ConsentInterstitial";
import {
  matchFollowUpChips,
  MODIFY_TIER_CHIP,
} from "@/lib/coach/follow-up-chips";
import { stripMarkdownForAnnouncement } from "@/lib/coach/strip-markdown";
import { Skeleton } from "@/components/ui/skeleton";

type Turn =
  | { kind: "user"; id: string; content: string; createdAt: string }
  | {
      kind: "assistant";
      id: string;
      content: string;
      citations: ChatCitation[];
      /** Never "stop" — a STOP-tier turn is always its own `{ kind: "stop" }`
       * entry instead (see the commit-turn effect below). */
      safetyTier: "coach" | "modify" | null;
      stub: boolean;
      createdAt: string;
    }
  | { kind: "stop"; id: string };

function newId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * A single conversation thread (design-spec 03 §1, §2). Orchestrates: history
 * load (§1), the live streaming turn (§2, built on `useChatStream`), the
 * STOP-tier escalation (§7), citations/follow-ups on a settled COACH/MODIFY
 * answer (§4, §8.2, §13), the first-run consent interstitial (§6.3), and every
 * error/kill-switch/stub state (§9). The parent (`CoachShell`) is expected to
 * `key={sessionId ?? "new"}` this component so switching threads (or starting
 * a new one) always gets fresh state rather than manually resetting it.
 */
export function ChatThread({
  accessToken,
  sessionId,
  initialComposerValue = "",
  isBrandNewUser,
  onSessionResolved,
  onTurnSettled,
  modifyDeepLinkHref,
}: {
  accessToken: string;
  sessionId: string | null;
  initialComposerValue?: string;
  isBrandNewUser: boolean;
  onSessionResolved?: (sessionId: string) => void;
  onTurnSettled?: () => void;
  modifyDeepLinkHref?: string;
}) {
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionId);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(sessionId !== null);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [localTurns, setLocalTurns] = useState<Turn[]>([]);
  const [composerValue, setComposerValue] = useState(initialComposerValue);
  const [showConsent, setShowConsent] = useState(
    sessionId === null && isBrandNewUser && !hasSeenCoachConsent(),
  );
  const [killSwitched, setKillSwitched] = useState(false);
  const [announced, setAnnounced] = useState("");
  // Whether the one-shot session-collision quiet-retry (§9.5) has already
  // fired. State, not a ref: the render below needs to read it (to stop
  // suppressing the error banner if the collision recurs after the retry),
  // and reading a ref's `.current` during render is a lint error here
  // (react-hooks/refs) — it can silently desync from what's on screen.
  const [retriedCollision, setRetriedCollision] = useState(false);

  const lastQuestionRef = useRef("");
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chat = useChatStream({
    url: `${API_BASE}/api/v1/coach/chat/stream`,
    getToken: () => accessToken,
  });

  // History load (§1) — AbortController + cancelled-flag pattern (apps/web/CLAUDE.md).
  useEffect(() => {
    if (!sessionId) return undefined; // defaults already reflect the empty state
    const controller = new AbortController();
    let cancelled = false;

    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect.
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setHistoryLoading(true);
        setHistoryError(false);
      }
    });

    const client = createApiClient(accessToken);
    client.coach.sessions
      .messages(sessionId, { limit: historyLimit, signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setHistory(data.messages);
        setHistoryHasMore(data.has_more);
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        // Surfaced distinctly below (not folded into the empty/starter-prompt
        // state) — a resumed session whose fetch failed must not look
        // indistinguishable from a genuinely brand-new conversation.
        setHistoryError(true);
        void err;
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sessionId, accessToken, historyLimit, historyReloadKey]);

  // Focus management on resume (§0.5): land in the thread, not on the list row.
  useEffect(() => {
    if (sessionId) threadRef.current?.focus();
  }, [sessionId]);

  // Auto-scroll to the latest turn.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history, localTurns, chat.text, chat.status]);

  // Commit a settled/stopped turn; resolve a learned session id; recover
  // quietly from a session collision; detect the kill-switch.
  useEffect(() => {
    let cancelled = false;
    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (chat.status === "done") {
        setLocalTurns((prev) => [
          ...prev,
          {
            kind: "assistant",
            id: newId(),
            content: chat.text,
            citations: chat.citations,
            safetyTier: chat.safetyTier === "modify" ? "modify" : null,
            stub: chat.stub,
            createdAt: new Date().toISOString(),
          },
        ]);
        setAnnounced(stripMarkdownForAnnouncement(chat.text));
        if (chat.sessionId && chat.sessionId !== resolvedSessionId) {
          setResolvedSessionId(chat.sessionId);
          onSessionResolved?.(chat.sessionId);
        }
        onTurnSettled?.();
      } else if (chat.status === "stopped") {
        setLocalTurns((prev) => [...prev, { kind: "stop", id: newId() }]);
        setAnnounced(
          "Safety notice: this may be a medical emergency. Please stop and contact emergency services.",
        );
        if (chat.sessionId && chat.sessionId !== resolvedSessionId) {
          setResolvedSessionId(chat.sessionId);
          onSessionResolved?.(chat.sessionId);
        }
        onTurnSettled?.();
      } else if (chat.status === "aborted") {
        // Stop retains the partial text (design-spec 03 §2) — commit it as a
        // settled turn so it isn't lost, and offer Retry via the isAborted
        // banner below rather than the follow-up-chip surface (this turn is
        // incomplete, not a finished answer).
        if (chat.text.length > 0) {
          setLocalTurns((prev) => [
            ...prev,
            {
              kind: "assistant",
              id: newId(),
              content: chat.text,
              citations: [],
              safetyTier: null,
              stub: chat.stub,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } else if (chat.status === "error") {
        if (chat.httpStatus === 503) {
          setKillSwitched(true);
        } else if (
          chat.errorSubtype === "technical" &&
          chat.error === "Session not found." &&
          !retriedCollision
        ) {
          // Quiet recovery (§9.5): never show the raw collision — start a fresh
          // thread and re-send the same question once.
          setRetriedCollision(true);
          setResolvedSessionId(null);
          void chat.send(lastQuestionRef.current, undefined);
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // chat.text/citations/safetyTier/stub/sessionId/error/httpStatus are all
    // settled together with chat.status in the same commit (see use-chat-stream);
    // status alone is the correct trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.status]);

  function doSend(question: string) {
    const trimmed = question.trim();
    if (!trimmed || killSwitched) return;
    lastQuestionRef.current = trimmed;
    setRetriedCollision(false);
    setLocalTurns((prev) => [
      ...prev,
      {
        kind: "user",
        id: newId(),
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setComposerValue("");
    void chat.send(trimmed, resolvedSessionId ?? undefined);
  }

  function handleRetry() {
    void chat.send(lastQuestionRef.current, resolvedSessionId ?? undefined);
  }

  const isEmpty =
    !historyLoading &&
    !historyError &&
    history.length === 0 &&
    localTurns.length === 0 &&
    chat.status === "idle";

  const isRateLimited = chat.status === "error" && chat.httpStatus === 429;
  // Suppress the banner only for the ONE quiet auto-retry attempt (§9.5) — if
  // "Session not found." recurs after that retry already fired,
  // retriedCollision is already true, so this stops shadowing the error and
  // the user isn't left with a disabled-looking, silently-stuck composer and
  // no feedback at all.
  const isRecoveringFromCollision =
    chat.status === "error" &&
    chat.errorSubtype === "technical" &&
    chat.error === "Session not found." &&
    !retriedCollision;
  const isTechnicalError =
    chat.status === "error" &&
    chat.httpStatus !== 503 &&
    !isRateLimited &&
    !isRecoveringFromCollision;
  const isStreamingLive = chat.status === "streaming";
  const isAborted = chat.status === "aborted";

  const lastAssistantTurn = [...localTurns]
    .reverse()
    .find(
      (t): t is Extract<Turn, { kind: "assistant" }> => t.kind === "assistant",
    );
  const showFollowUps =
    !isStreamingLive &&
    chat.status !== "stopped" &&
    chat.status !== "aborted" &&
    lastAssistantTurn !== undefined &&
    localTurns[localTurns.length - 1]?.id === lastAssistantTurn.id;

  return (
    <div
      ref={threadRef}
      tabIndex={-1}
      data-testid="coach-thread"
      className="flex h-full flex-col outline-none"
    >
      <div aria-live="polite" className="sr-only">
        {announced}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {killSwitched && (
          <div className="mb-4">
            <KillSwitchBanner />
          </div>
        )}

        {showConsent && (
          <ConsentInterstitial onContinue={() => setShowConsent(false)} />
        )}

        {!showConsent && historyLoading && (
          <div
            className="flex flex-col gap-3"
            data-testid="coach-history-skeleton"
          >
            <Skeleton className="h-12 w-2/3 self-end rounded-2xl" />
            <Skeleton className="h-16 w-3/4 rounded-lg" />
          </div>
        )}

        {!showConsent && !historyLoading && historyError && (
          <ChatErrorBanner
            message="Couldn't load this conversation."
            onRetry={() => setHistoryReloadKey((k) => k + 1)}
          />
        )}

        {!showConsent &&
          !historyLoading &&
          !historyError &&
          !killSwitched &&
          isEmpty && (
            <StarterPrompts
              onSend={doSend}
              onPopulate={(text) => setComposerValue(text)}
            />
          )}

        {!showConsent && !historyLoading && !historyError && !isEmpty && (
          <div className="flex flex-col gap-4">
            {historyHasMore && (
              <button
                type="button"
                onClick={() => setHistoryLimit((l) => l + 50)}
                className="w-fit self-center font-mono text-[11px] text-[var(--muted)] hover:text-[var(--text)]"
                data-testid="coach-load-earlier"
              >
                Load earlier messages
              </button>
            )}

            {history.map((m) => {
              // created_at is clock_timestamp()-backed (per-statement, not
              // per-transaction) since migration 0081, so it's unique per
              // message within a session — a stable fallback key per
              // apps/web/CLAUDE.md, unlike the array index (which shifts
              // every message when "Load earlier messages" prepends older
              // rows, silently reassigning each row's component state, e.g.
              // an expanded "Show reasoning" toggle, to a different message).
              const key = `${m.created_at}-${m.role}`;
              return m.role === "user" ? (
                <UserBubble
                  key={key}
                  content={m.content}
                  createdAt={m.created_at}
                />
              ) : m.safety_tier === "stop" ? (
                <SafetyStopNotice key={key} />
              ) : (
                <AssistantMessage
                  key={key}
                  phase="settled"
                  text={m.content}
                  safetyTier={m.safety_tier === "modify" ? "modify" : null}
                  createdAt={m.created_at}
                />
              );
            })}

            {localTurns.map((turn) => {
              if (turn.kind === "user") {
                return (
                  <UserBubble
                    key={turn.id}
                    content={turn.content}
                    createdAt={turn.createdAt}
                  />
                );
              }
              if (turn.kind === "stop") {
                return <SafetyStopNotice key={turn.id} />;
              }
              const isLast = localTurns[localTurns.length - 1]?.id === turn.id;
              const chips =
                turn.safetyTier === "modify"
                  ? modifyDeepLinkHref
                    ? [{ ...MODIFY_TIER_CHIP, href: modifyDeepLinkHref }]
                    : []
                  : matchFollowUpChips(turn.content);
              return (
                <AssistantMessage
                  key={turn.id}
                  phase="settled"
                  text={turn.content}
                  citations={turn.citations}
                  safetyTier={turn.safetyTier}
                  stub={turn.stub}
                  createdAt={turn.createdAt}
                  followUpChips={isLast && showFollowUps ? chips : []}
                  onSelectChip={isLast ? doSend : undefined}
                />
              );
            })}

            {chat.status === "streaming" && (
              <AssistantMessage
                phase={chat.text.length === 0 ? "thinking" : "streaming"}
                text={chat.text}
              />
            )}

            {isTechnicalError && (
              <ChatErrorBanner
                message={chat.error ?? "Something went wrong."}
                onRetry={handleRetry}
              />
            )}
            {isRateLimited && <RateLimitedNotice onRetry={handleRetry} />}
            {isAborted && (
              <ChatErrorBanner message="Stopped." onRetry={handleRetry} />
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isStreamingLive && (
        <div className="flex justify-center px-4 pb-2">
          <button
            type="button"
            onClick={chat.abort}
            data-testid="coach-stop-button"
            className="min-h-9 rounded-full border px-4 py-1.5 font-sans text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: "var(--border)" }}
          >
            Stop
          </button>
        </div>
      )}

      <ChatComposer
        value={composerValue}
        onChange={setComposerValue}
        onSend={() => doSend(composerValue)}
        disabled={isStreamingLive || killSwitched || showConsent}
      />
    </div>
  );
}
