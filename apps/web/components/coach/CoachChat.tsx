"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { api } from "@/lib/api/client";
import type { Citation } from "@/lib/api";

interface Message {
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

const STARTER_PROMPTS = [
  "Why did my ACWR spike this week?",
  "How do I scale Fran if my kipping needs work?",
  "What does RPE 8 feel like vs RPE 9?",
  "Is my current program building strength or endurance?",
];

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm text-zinc-200">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-zinc-700 px-1 py-0.5 font-mono text-xs text-indigo-300">
      {children}
    </code>
  ),
};

function CoachTypingIndicator() {
  return (
    <div className="self-start rounded-lg bg-zinc-800 px-4 py-3">
      <span className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

export function CoachChat({ accessToken }: CoachChatProps) {
  const showStubBadge = process.env.NEXT_PUBLIC_SHOW_STUB_BADGE !== "false";

  // Session persistence across page reloads
  const sessionId = useRef<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("coach_session_id") ?? crypto.randomUUID()
      : crypto.randomUUID(),
  );
  useEffect(() => {
    localStorage.setItem("coach_session_id", sessionId.current);
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showPill, setShowPill] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rehydrate history on mount — input disabled until resolved
  useEffect(() => {
    api.coach
      .history(accessToken, sessionId.current)
      .then((turns) =>
        setMessages(
          turns.map((t) => ({
            role: t.role as "user" | "assistant",
            content: t.content,
          })),
        ),
      )
      .catch(() => {}) // silent — user starts fresh if history fetch fails
      .finally(() => setHistoryLoading(false));
  }, [accessToken]);

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

    setMessages((prev) => [...prev, { role: "user", content: question }]);
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
            <p className="font-mono text-xs text-zinc-500">
              $ git coach --help
            </p>
            <p className="font-mono text-xs text-zinc-600">
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
                  className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2.5
                             text-left font-mono text-xs text-zinc-400 transition-colors
                             hover:border-indigo-700 hover:text-zinc-200"
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
            <div className="h-10 animate-pulse rounded-lg bg-zinc-800/50" />
            <div className="h-10 animate-pulse rounded-lg bg-zinc-800/50" />
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? "self-end max-w-prose rounded-lg bg-indigo-900/60 px-3 py-2 text-sm text-zinc-100"
                  : msg.error
                    ? "self-start max-w-prose rounded-lg border border-red-800 bg-zinc-800 px-3 py-2 text-sm text-red-400"
                    : msg.safetyTier === "stop"
                      ? "self-start max-w-prose rounded-lg border-l-4 border-amber-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                      : "self-start max-w-prose rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
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
                    <li key={j} className="font-mono text-xs text-zinc-400">
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
                  className="mt-1 font-mono text-xs text-zinc-500 underline hover:text-zinc-300"
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
                       bg-indigo-700 px-3 py-1 font-mono text-xs text-white shadow-lg"
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
            className="w-full resize-none overflow-y-auto rounded border border-zinc-700
                       bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100
                       placeholder-zinc-600 focus:outline-none focus:ring-1
                       focus:ring-indigo-500 disabled:opacity-50 max-h-36"
            data-testid="coach-chat-input"
            placeholder="Ask your coach… (⌘↵ to send)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            maxLength={1000}
          />
          {input.length > 800 && (
            <span className="absolute bottom-2 right-2 font-mono text-xs text-zinc-500">
              {input.length}/1000
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isDisabled || !input.trim()}
          className="rounded bg-indigo-700 px-4 py-2 font-mono text-sm text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          send
        </button>
      </form>

      {/* Session context indicator */}
      {userTurns >= 2 && (
        <div className="flex shrink-0 items-center justify-between">
          <p className="font-mono text-xs text-zinc-500">
            session active · {userTurns} turns
          </p>
          <button
            onClick={startNewChat}
            className="font-mono text-xs text-zinc-400 hover:text-zinc-200"
          >
            + new chat
          </button>
        </div>
      )}
    </div>
  );
}
