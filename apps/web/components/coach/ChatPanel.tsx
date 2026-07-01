"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { StarterPrompts } from "./StarterPrompts";
import { SuggestionPills } from "./SuggestionPills";
import { ChatInput } from "./ChatInput";
import { api } from "@/lib/api/client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ChatPanelProps {
  token: string;
  sessionId: string | null;
  userEmail: string;
  onSessionCreated: (id: string) => void;
  onMessagesLoaded?: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function userInitial(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function ChatPanel({
  token,
  sessionId,
  userEmail,
  onSessionCreated,
  onMessagesLoaded,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // Initialize true when sessionId provided — component remounts on session change via key prop
  const [historyLoading, setHistoryLoading] = useState(!!sessionId);
  const [showScrollPill, setShowScrollPill] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((text: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = "";
      requestAnimationFrame(() => {
        if (liveRegionRef.current) liveRegionRef.current.textContent = text;
      });
    }
  }, []);

  // Rehydrate messages when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      // ChatPanel remounts via key={sessionId ?? "new"}, so state is already reset
      onMessagesLoaded?.();
      return;
    }

    api.coach.sessions
      .messages(token, sessionId)
      .then((resp) => {
        setMessages(
          resp.messages.map((m) => ({
            id: makeId(),
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.created_at,
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        setHistoryLoading(false);
        onMessagesLoaded?.();
      });
  }, [sessionId, token, onMessagesLoaded]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollPill(false);
    } else {
      setShowScrollPill(true);
    }
  }, [messages]);

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    // Optimistically add user message
    const userMsgId = makeId();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");

    // Add placeholder assistant message
    const assistantMsgId = makeId();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "", streaming: true },
    ]);
    setIsStreaming(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = AbortSignal.any
      ? AbortSignal.any([abortRef.current.signal, AbortSignal.timeout(90_000)])
      : abortRef.current.signal;

    let firstToken = false;

    try {
      const res = await fetch(`${BASE}/api/v1/coach/chat/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed, session_id: sessionId }),
        signal,
      });

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "", error: true, streaming: false }
              : m,
          ),
        );
        announce("Coach is unavailable. Try again.");
        toast.error("Coach is unavailable", {
          description: "Check your connection and try again.",
          duration: 6000,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(part.slice(6)) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (event.type === "token" && typeof event.text === "string") {
            if (!firstToken) {
              firstToken = true;
              // Replace typing indicator with streaming bubble
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + event.text, streaming: true }
                  : m,
              ),
            );
          }

          if (event.type === "error" && typeof event.message === "string") {
            const isSafetyStop =
              typeof event.safety_tier === "string"
                ? event.safety_tier === "stop"
                : (event.message as string).includes("medical professional");

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: event.message as string,
                      streaming: false,
                      safetyTier: isSafetyStop ? "stop" : undefined,
                      error: !isSafetyStop,
                    }
                  : m,
              ),
            );
            announce(
              isSafetyStop
                ? "Coach flagged a medical concern."
                : "Coach is unavailable. Try again.",
            );
            return;
          }

          if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      streaming: false,
                      safetyTier:
                        typeof event.safety_tier === "string"
                          ? event.safety_tier
                          : undefined,
                    }
                  : m,
              ),
            );

            const newSessionId =
              typeof event.session_id === "string" ? event.session_id : null;
            if (newSessionId && !sessionId) {
              onSessionCreated(newSessionId);
              announce("New session started");
            } else {
              announce("Coach responded");
            }
          }
        }
      }
    } catch (err) {
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.name === "TimeoutError");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: "",
                error: !isAbort,
                streaming: false,
              }
            : m,
        ),
      );
      if (!isAbort) {
        announce("Coach is unavailable. Try again.");
        toast.error("Coach is unavailable", {
          description: "Check your connection and try again.",
          duration: 6000,
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  }

  function handleRetry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) =>
      prev.filter((m) => m.id !== prev[prev.length - 1]?.id),
    );
    void sendMessage(lastUser.content);
  }

  const hasMessages = messages.length > 0;
  const showTypingDots =
    isStreaming && !messages.some((m) => m.streaming && m.content.length > 0);

  // Show suggestion pills when chat is empty or after the last AI response
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const showSuggestionsAfterResponse =
    hasMessages &&
    !isStreaming &&
    lastMsg?.role === "assistant" &&
    !lastMsg.streaming &&
    !lastMsg.error;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Accessibility live region */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      <div
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        id="coach-error-region"
      />

      {/* Message area */}
      <section
        aria-label="Coach conversation"
        className="relative flex-1 min-h-0 overflow-hidden"
      >
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const nearBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            setShowScrollPill(!nearBottom);
          }}
        >
          <div className="flex flex-col gap-3 px-4 py-4">
            {historyLoading ? (
              <div className="flex flex-col gap-3">
                <div className="self-start w-[55%]">
                  <Skeleton className="h-14 rounded-[4px_16px_16px_16px] bg-[var(--surface-2)]" />
                </div>
                <div className="self-end w-[40%]">
                  <Skeleton className="h-10 rounded-[16px_4px_16px_16px] bg-[var(--surface-2)]/60" />
                </div>
                <div className="self-start w-[65%]">
                  <Skeleton className="h-20 rounded-[4px_16px_16px_16px] bg-[var(--surface-2)]" />
                </div>
              </div>
            ) : !hasMessages ? (
              <StarterPrompts />
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  userInitial={userInitial(userEmail)}
                  onRetry={msg.error ? handleRetry : undefined}
                />
              ))
            )}

            {showTypingDots && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showScrollPill && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowScrollPill(false);
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--blue)] px-3 py-1 font-mono text-xs text-[#0A0D12] shadow-lg"
          >
            ↓ new message
          </button>
        )}
      </section>

      {/* Suggestion pills — shown in empty state and after each AI response */}
      {(!hasMessages || showSuggestionsAfterResponse) && (
        <SuggestionPills onSelect={(p) => setInput(p)} />
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => void sendMessage(input)}
        onStop={handleStop}
        disabled={historyLoading}
        isStreaming={isStreaming}
        autoFocus
      />
    </div>
  );
}
