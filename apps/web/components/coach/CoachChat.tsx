"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { api } from "@/lib/api/client";
import type { Citation } from "@/lib/api";
import { STARTER_PROMPTS } from "@/lib/coach/starterPrompts";

function toRole(s: string): "user" | "assistant" {
  return s === "user" ? "user" : "assistant";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  stub?: boolean;
  error?: boolean;
  safetyTier?: string;
}

interface CoachChatProps {
  accessToken: string;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-[var(--text)]">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--text)]">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs text-[var(--accent)]">
      {children}
    </code>
  ),
};

function CoachTypingIndicator() {
  return (
    <div className="self-start rounded-lg bg-[var(--surface)] px-4 py-3">
      <span className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="inline-block h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-[var(--muted)]"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

export function CoachChat({ accessToken }: CoachChatProps) {
  const showStubBadge = process.env.NEXT_PUBLIC_SHOW_STUB_BADGE !== "false";

  // Initialize with a stable UUID for SSR. The stored session ID is read in
  // useEffect (client-only) to avoid an SSR/client hydration mismatch.
  const sessionId = useRef<string>(crypto.randomUUID());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showPill, setShowPill] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyAbortRef = useRef<AbortController | null>(null);

  function loadHistory(sid: string) {
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;
    api.coach
      .history(accessToken, sid, 20, controller.signal)
      .then((turns) => {
        if (controller.signal.aborted) return;
        setMessages(
          turns.map((t) => ({
            id: crypto.randomUUID(),
            role: toRole(t.role),
            content: t.content,
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (controller.signal.aborted) return;
        setHistoryLoading(false);
      });
  }

  // Read the stored session ID on mount; upgrade to persisted session if found.
  useEffect(() => {
    const stored = localStorage.getItem("coach_session_id");
    if (stored) {
      sessionId.current = stored;
      loadHistory(stored);
    } else {
      localStorage.setItem("coach_session_id", sessionId.current);
      // Defer to a microtask so setState is not called synchronously in the effect
      // body (satisfies react-hooks/set-state-in-effect).
      void Promise.resolve().then(() => setHistoryLoading(false));
    }
    return () => {
      historyAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll management: auto-scroll when near bottom, show pill when away
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowPill(false);
    } else {
      setShowPill(true);
    }
  }, [messages]);

  function startNewChat() {
    const newId = crypto.randomUUID();
    sessionId.current = newId;
    localStorage.setItem("coach_session_id", newId);
    setMessages([]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: question },
    ]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await api.coach.chat(
        accessToken,
        question,
        sessionId.current,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          citations: res.citations,
          stub: res.stub,
          safetyTier: res.safety_tier ?? undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "✗ network error — try again",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = loading || historyLoading;
  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {/* Message list with scroll management — fills available height */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 min-h-0 overflow-y-auto"
      >
        {/* Empty state with starter prompts */}
        {messages.length === 0 && !historyLoading && (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs text-[var(--muted)]">
              $ git coach --help
            </p>
            <p className="font-mono text-xs" style={{ color: "var(--border)" }}>
              # click a prompt or ask anything
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5
                             text-left font-mono text-xs text-[var(--muted)] transition-colors
                             hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History loading skeleton */}
        {historyLoading && (
          <div className="flex flex-col gap-2">
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface)]" />
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user"
                  ? "self-end max-w-prose rounded-lg bg-[rgba(88,166,255,0.12)] px-3 py-2 text-sm text-[var(--text)]"
                  : msg.error
                    ? "self-start max-w-prose rounded-lg border border-[var(--red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--red)]"
                    : msg.safetyTier === "stop"
                      ? "self-start max-w-prose rounded-lg border-l-4 border-[var(--amber)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                      : "self-start max-w-prose rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              }
              data-testid={
                msg.role === "assistant" ? "chat-response" : undefined
              }
            >
              {msg.role === "assistant" && !msg.error ? (
                <Markdown components={markdownComponents}>
                  {msg.content}
                </Markdown>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.safetyTier === "stop" && (
                <span className="mt-1 inline-block rounded bg-amber-900 px-1.5 py-0.5 font-mono text-xs text-amber-300">
                  ⚠ medical concern
                </span>
              )}

              {msg.stub && showStubBadge && (
                <span
                  className="mt-1 inline-block rounded bg-yellow-600 px-1.5 py-0.5 font-mono text-xs text-yellow-50"
                  data-testid="stub-mode-badge"
                >
                  STUB
                </span>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {msg.citations.map((c, j) => (
                    <li
                      key={c.title ?? `${c.source_type}-${j}`}
                      className="font-mono text-xs text-[var(--muted)]"
                    >
                      [{c.source_type}] {c.title}
                    </li>
                  ))}
                </ul>
              )}

              {msg.error && (
                <button
                  onClick={() => {
                    const lastUser = [...messages]
                      .reverse()
                      .find((m) => m.role === "user");
                    if (lastUser) {
                      setInput(lastUser.content);
                      setMessages((prev) => prev.slice(0, -1));
                    }
                  }}
                  className="mt-1 font-mono text-xs text-[var(--muted)] underline hover:text-[var(--text)]"
                >
                  retry
                </button>
              )}
            </div>
          ))}

          {loading && <CoachTypingIndicator />}
        </div>

        <div ref={messagesEndRef} />

        {showPill && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowPill(false);
            }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full
                       bg-[var(--accent)] px-3 py-1 font-mono text-xs text-[#0d1117] shadow-lg"
          >
            ↓ new message
          </button>
        )}
      </div>

      {/* Input form — pinned below the message list */}
      <form onSubmit={handleSubmit} className="flex shrink-0 items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full resize-none overflow-y-auto rounded border border-[var(--border)]
                       bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text)]
                       placeholder-[var(--muted)] focus:outline-none focus:ring-1
                       focus:ring-[var(--accent)] disabled:opacity-50 max-h-36"
            data-testid="coach-chat-input"
            placeholder="Ask your coach… (⌘↵ to send)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            maxLength={1000}
          />
          {input.length > 800 && (
            <span className="absolute bottom-2 right-2 font-mono text-xs text-[var(--muted)]">
              {input.length}/1000
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isDisabled || !input.trim()}
          className="rounded bg-[var(--accent)] px-4 py-2 font-mono text-sm text-[#0d1117] hover:opacity-90 disabled:opacity-40"
        >
          send
        </button>
      </form>

      {/* Session context indicator */}
      {userTurns >= 2 && (
        <div className="flex shrink-0 items-center justify-between">
          <p className="font-mono text-xs text-[var(--muted)]">
            session active · {userTurns} turns
          </p>
          <button
            onClick={startNewChat}
            className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
          >
            + new chat
          </button>
        </div>
      )}
    </div>
  );
}
