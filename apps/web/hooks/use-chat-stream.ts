"use client";

import { useCallback, useRef, useState } from "react";

// Core streaming primitive for the Coach AI chat (0.25, 09 §3).
//
// A thin custom hook over `fetch` + `ReadableStream.getReader()` — NOT EventSource,
// which is GET-only and can't send the `Authorization: Bearer <jwt>` the FastAPI
// backend requires. Frames are the app's own vocabulary (token / error{subtype} /
// done). Tokens are buffered in a ref and flushed to React state on a rAF throttle so
// paint frequency is decoupled from token frequency (no per-token re-render storm).
// No UI here — this is the mechanism the chat surface (Effort 7) builds on.

export type ChatStatus =
  | "idle"
  | "streaming"
  | "stopped" // terminal, non-retryable — a safety STOP (error.subtype)
  | "error" // retryable technical failure
  | "done";

/** A parsed SSE frame in the app's own vocabulary. */
export type ChatFrame =
  | { type: "token"; text: string }
  | { type: "error"; subtype: "stop" | "technical"; message?: string }
  | { type: "done" };

export interface UseChatStreamOptions {
  /** Endpoint that returns the SSE stream (POST). */
  url: string;
  /** Returns a fresh Supabase JWT for the `Authorization` header. */
  getToken: () => string | Promise<string>;
  /**
   * Injectable fetch, for tests. Defaults to global `fetch`. A test can pass a fetch
   * that resolves a `Response` wrapping a scripted `ReadableStream` of SSE frames.
   */
  fetchImpl?: typeof fetch;
  /**
   * Flush the token buffer synchronously instead of on `requestAnimationFrame`. Tests
   * set this so accumulated text is observable without driving a real animation frame.
   */
  synchronousFlush?: boolean;
}

export interface UseChatStreamResult {
  status: ChatStatus;
  /** Accumulated assistant text so far (kept visible on stop/error/abort). */
  text: string;
  /** Terminal error message, when status is "error" or "stopped". */
  error: string | null;
  /** Start a turn. Sends an idempotency key so a retry can't double-invoke the LLM. */
  send: (message: string) => Promise<void>;
  /** Abort the in-flight turn; partial text is preserved. */
  abort: () => void;
}

/** Split a raw SSE buffer on frame boundaries; returns complete frames + the remainder. */
function splitFrames(buffer: string): { frames: string[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { frames: parts.filter((p) => p.trim().length > 0), rest };
}

/** Parse one raw SSE frame (`data: {json}`) into the app's frame vocabulary. */
export function parseFrame(raw: string): ChatFrame | null {
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("data:"));
  if (!line) return null;
  const payload = line.slice("data:".length).trim();
  if (!payload) return null;
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    const type = obj.type;
    if (type === "token" && typeof obj.text === "string") {
      return { type: "token", text: obj.text };
    }
    if (type === "done") return { type: "done" };
    if (type === "error") {
      const subtype = obj.subtype === "stop" ? "stop" : "technical";
      const message = typeof obj.message === "string" ? obj.message : undefined;
      return { type: "error", subtype, message };
    }
    return null;
  } catch {
    return null;
  }
}

function newIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChatStream(
  options: UseChatStreamOptions,
): UseChatStreamResult {
  const { url, getToken, fetchImpl, synchronousFlush = false } = options;

  const [status, setStatus] = useState<ChatStatus>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Token buffer + rAF handle: accumulate off-render, flush on a frame.
  const bufferRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    if (bufferRef.current.length === 0) return;
    const chunk = bufferRef.current;
    bufferRef.current = "";
    setText((prev) => prev + chunk);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (synchronousFlush) {
      flush();
      return;
    }
    if (rafRef.current !== null) return;
    if (typeof requestAnimationFrame === "function") {
      rafRef.current = requestAnimationFrame(flush);
    } else {
      flush();
    }
  }, [flush, synchronousFlush]);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    // Preserve any buffered text before tearing down.
    flush();
  }, [flush]);

  const send = useCallback(
    async (message: string) => {
      // Reset per-turn state; keep no stale text from a prior turn.
      bufferRef.current = "";
      setText("");
      setError(null);
      setStatus("streaming");

      const controller = new AbortController();
      controllerRef.current = controller;
      const doFetch = fetchImpl ?? fetch;

      try {
        const token = await getToken();
        const response = await doFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": newIdempotencyKey(),
          },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setStatus("error");
          setError(`Request failed (${response.status})`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        let terminal: ChatStatus | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const { frames, rest } = splitFrames(raw);
          raw = rest;
          for (const frameText of frames) {
            const frame = parseFrame(frameText);
            if (!frame) continue;
            if (frame.type === "token") {
              bufferRef.current += frame.text;
              scheduleFlush();
            } else if (frame.type === "done") {
              terminal = "done";
            } else {
              // error frame: STOP is terminal/non-retryable, technical is retryable
              terminal = frame.subtype === "stop" ? "stopped" : "error";
              setError(frame.message ?? null);
            }
          }
          if (terminal) break;
        }

        flush();
        setStatus(terminal ?? "done");
      } catch (err) {
        flush();
        if (controller.signal.aborted) {
          // Aborted turns keep their partial text and fall back to idle.
          setStatus("idle");
          return;
        }
        setStatus("error");
        setError(err instanceof Error ? err.message : "Stream failed");
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [url, getToken, fetchImpl, scheduleFlush, flush],
  );

  return { status, text, error, send, abort };
}
