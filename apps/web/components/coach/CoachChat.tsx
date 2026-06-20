"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { Citation } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  stub?: boolean;
}

interface CoachChatProps {
  accessToken: string;
}

export function CoachChat({ accessToken }: CoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const showStubBadge = process.env.NEXT_PUBLIC_SHOW_STUB_BADGE !== "false";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.coach.chat(accessToken, question);
      const assistantMsg: Message = {
        role: "assistant",
        content: res.answer,
        citations: res.citations,
        stub: res.stub,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error reaching coach. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 min-h-64">
        {messages.length === 0 && (
          <p className="text-zinc-500 font-mono text-sm">
            # Ask about programming, readiness, or movement standards
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user"
                ? "self-end rounded-lg bg-indigo-900/60 px-3 py-2 text-sm text-zinc-100 max-w-prose"
                : "self-start rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 max-w-prose"
            }
            data-testid={msg.role === "assistant" ? "chat-response" : undefined}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
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
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
            thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach..."
          disabled={loading}
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-indigo-700 px-4 py-2 font-mono text-sm text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          send
        </button>
      </form>
    </div>
  );
}
