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

/** Matches `apps/api/app/models/coach.py::Citation`. */
export interface ChatCitation {
  title: string;
  source_type: string;
  score: number;
}

export type ChatSafetyTier = "coach" | "modify" | "stop";

/** A parsed SSE frame in the app's own vocabulary. */
export type ChatFrame =
  | { type: "token"; text: string }
  | {
      type: "error";
      subtype: "stop" | "technical";
      message?: string;
      /** Only ever present on a STOP-tier error — a STOP always gets a session
       * (existing, reused, or freshly created) even though the LLM is never
       * called, so the client can navigate a brand-new thread to it. */
      sessionId?: string;
    }
  | {
      type: "done";
      sessionId?: string;
      citations?: ChatCitation[];
      safetyTier?: ChatSafetyTier;
      stub?: boolean;
    };

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
  /** Distinguishes a safety STOP from a technical failure (both arrive as `error`
   * frames server-side today — see design-spec 03 §7's backend-prerequisite note).
   * `null` until an error frame (or a non-ok HTTP response) has been seen. */
  errorSubtype: "stop" | "technical" | null;
  /** Raw HTTP status of the initial POST when it was not `ok` (e.g. 503 kill-switch,
   * 429 per-user rate limit, 409 session collision). `null` on a normal stream. */
  httpStatus: number | null;
  /** `session_id` from the terminal `done` frame — the caller's session moved to
   * (or was created as) once the first turn completes. Sticky across turns within
   * the same hook instance; only cleared by unmounting/remounting (key-based reset). */
  sessionId: string | null;
  /** Citations from the terminal `done` frame, sorted by the caller (Section 4 —
   * this hook does not sort, it just carries what the server sent). */
  citations: ChatCitation[];
  /** `safety_tier` from the terminal `done` frame. Only ever "coach" or "modify" in
   * practice — a "stop" tier short-circuits to an `error` frame before `done`. */
  safetyTier: ChatSafetyTier | null;
  /** `stub` from the terminal `done` frame — dev/test-double mode (design-spec §9.2). */
  stub: boolean;
  /** Start a turn. Sends an idempotency key so a retry can't double-invoke the LLM.
   * Pass `sessionId` to resume an existing thread; omit it to let the backend
   * auto-create a new session. */
  send: (message: string, sessionId?: string) => Promise<void>;
  /** Abort the in-flight turn; partial text is preserved. */
  abort: () => void;
}

/** Split a raw SSE buffer on frame boundaries; returns complete frames + the remainder. */
function splitFrames(buffer: string): { frames: string[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { frames: parts.filter((p) => p.trim().length > 0), rest };
}

function isChatCitation(value: unknown): value is ChatCitation {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.title === "string" &&
    typeof c.source_type === "string" &&
    typeof c.score === "number"
  );
}

function parseSafetyTier(value: unknown): ChatSafetyTier | undefined {
  return value === "coach" || value === "modify" || value === "stop"
    ? value
    : undefined;
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
    if (type === "done") {
      const sessionId =
        typeof obj.session_id === "string" ? obj.session_id : undefined;
      const citations = Array.isArray(obj.citations)
        ? obj.citations.filter(isChatCitation)
        : undefined;
      const safetyTier = parseSafetyTier(obj.safety_tier);
      const stub = typeof obj.stub === "boolean" ? obj.stub : undefined;
      return { type: "done", sessionId, citations, safetyTier, stub };
    }
    if (type === "error") {
      const subtype = obj.subtype === "stop" ? "stop" : "technical";
      const message = typeof obj.message === "string" ? obj.message : undefined;
      const sessionId =
        typeof obj.session_id === "string" ? obj.session_id : undefined;
      return { type: "error", subtype, message, sessionId };
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

/** Best-effort extraction of a JSON `detail` string from a non-ok Response body
 * (FastAPI's HTTPException shape), for surfacing the exact kill-switch/rate-limit
 * copy the backend sent rather than a generic "Request failed (503)" fallback. */
async function tryReadDetail(response: Response): Promise<string | null> {
  if (!response.body) return null;
  try {
    const data = (await response.clone().json()) as { detail?: unknown };
    return typeof data.detail === "string" ? data.detail : null;
  } catch {
    return null;
  }
}

export function useChatStream(
  options: UseChatStreamOptions,
): UseChatStreamResult {
  const { url, getToken, fetchImpl, synchronousFlush = false } = options;

  const [status, setStatus] = useState<ChatStatus>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorSubtype, setErrorSubtype] = useState<"stop" | "technical" | null>(
    null,
  );
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [citations, setCitations] = useState<ChatCitation[]>([]);
  const [safetyTier, setSafetyTier] = useState<ChatSafetyTier | null>(null);
  const [stub, setStub] = useState(false);

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
    async (message: string, targetSessionId?: string) => {
      // Reset per-turn state; keep no stale text/citations from a prior turn.
      // sessionId is intentionally NOT reset here — it stays sticky across
      // turns in the same thread (callers key the surrounding component on
      // sessionId to get a fresh hook instance for a genuinely new thread).
      bufferRef.current = "";
      setText("");
      setError(null);
      setErrorSubtype(null);
      setHttpStatus(null);
      setCitations([]);
      setSafetyTier(null);
      setStub(false);
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
          body: JSON.stringify(
            targetSessionId
              ? { question: message, session_id: targetSessionId }
              : { question: message },
          ),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const detail = await tryReadDetail(response);
          setStatus("error");
          setErrorSubtype("technical");
          setHttpStatus(response.status);
          setError(detail ?? `Request failed (${response.status})`);
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
              if (frame.sessionId) setSessionId(frame.sessionId);
              if (frame.citations) setCitations(frame.citations);
              if (frame.safetyTier) setSafetyTier(frame.safetyTier);
              if (frame.stub !== undefined) setStub(frame.stub);
            } else {
              // error frame: STOP is terminal/non-retryable, technical is retryable
              terminal = frame.subtype === "stop" ? "stopped" : "error";
              setError(frame.message ?? null);
              setErrorSubtype(frame.subtype);
              if (frame.sessionId) setSessionId(frame.sessionId);
            }
          }
          if (terminal) break;
        }

        flush();
        if (terminal === null) {
          // Stream closed with no done/error frame (design-spec 03 §2, §9.3) —
          // treat as a technical failure with a retry affordance, same as any
          // other in-band error, rather than silently stalling on "streaming".
          setErrorSubtype("technical");
          setError("The response ended unexpectedly.");
          setStatus("error");
        } else {
          setStatus(terminal);
        }
      } catch (err) {
        flush();
        if (controller.signal.aborted) {
          // Aborted turns keep their partial text and fall back to idle.
          setStatus("idle");
          return;
        }
        setStatus("error");
        setErrorSubtype("technical");
        setError(err instanceof Error ? err.message : "Stream failed");
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [url, getToken, fetchImpl, scheduleFlush, flush],
  );

  return {
    status,
    text,
    error,
    errorSubtype,
    httpStatus,
    sessionId,
    citations,
    safetyTier,
    stub,
    send,
    abort,
  };
}
