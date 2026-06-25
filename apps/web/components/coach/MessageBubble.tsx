"use client";

import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { Terminal } from "lucide-react";
import type { Citation } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: boolean;
  safetyTier?: string;
  citations?: Citation[];
  stub?: boolean;
  createdAt?: string;
}

interface MessageBubbleProps {
  msg: Message;
  userInitial?: string;
  onRetry?: () => void;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm text-[#e6edf3]">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[#e6edf3]">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[#0d1117] px-1 py-0.5 font-mono text-xs text-[#58a6ff]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-[#0d1117] p-3 font-mono text-xs text-[#e6edf3]">
      {children}
    </pre>
  ),
};

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function MessageBubble({
  msg,
  userInitial,
  onRetry,
}: MessageBubbleProps) {
  const showStubBadge = process.env.NEXT_PUBLIC_SHOW_STUB_BADGE !== "false";
  const isUser = msg.role === "user";

  const borderClass = msg.error
    ? "border-l-2 border-[#ff7b72]"
    : msg.safetyTier === "stop"
      ? "border-l-2 border-[#d29922]"
      : isUser
        ? "border-r-2 border-[#30363d]"
        : "border-l-2 border-[#58a6ff]";

  const bgClass = isUser ? "bg-[#161b22]/60" : "bg-[#161b22]";

  const radiusClass = isUser
    ? "rounded-l-lg rounded-br-lg"
    : "rounded-r-lg rounded-bl-lg";

  return (
    <div
      className={`flex flex-col gap-1 max-w-[82%] md:max-w-[67%] ${
        isUser ? "self-end items-end" : "self-start items-start"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-1.5 text-xs text-[#8b949e] font-mono">
        {!isUser && <Terminal size={11} aria-hidden />}
        <span>{isUser ? userInitial ?? "You" : "Coach"}</span>
        <span>·</span>
        <span>{formatTime(msg.createdAt) || "now"}</span>
      </div>

      {/* Bubble */}
      <div
        className={`px-3 py-2 text-sm text-[#e6edf3] ${bgClass} ${borderClass} ${radiusClass}`}
        data-testid={msg.role === "assistant" ? "chat-response" : undefined}
      >
        {msg.error ? (
          <div>
            <p className="font-mono text-xs text-[#ff7b72]">
              ✗ Coach is unavailable.
            </p>
            <p className="font-mono text-xs text-[#8b949e] mt-0.5">
              Check your connection and try again.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-1.5 font-mono text-xs text-[#8b949e] underline hover:text-[#e6edf3]"
              >
                retry ↩
              </button>
            )}
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div>
            <Markdown components={markdownComponents}>{msg.content}</Markdown>
            {msg.streaming && (
              <span className="inline-block w-0.5 h-3.5 bg-[#58a6ff] animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {msg.safetyTier === "stop" && !msg.error && (
          <span className="mt-1 inline-block rounded bg-[#d29922]/20 px-1.5 py-0.5 font-mono text-xs text-[#d29922]">
            ⚠ medical concern
          </span>
        )}

        {msg.stub && showStubBadge && (
          <span
            className="mt-1 inline-block rounded bg-[#d29922]/20 px-1.5 py-0.5 font-mono text-xs text-[#d29922]"
            data-testid="stub-mode-badge"
          >
            STUB
          </span>
        )}

        {msg.citations && msg.citations.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-[#30363d] pt-1.5">
            {msg.citations.map((c, j) => (
              <li key={j} className="font-mono text-xs text-[#8b949e]">
                [{c.source_type}] {c.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
