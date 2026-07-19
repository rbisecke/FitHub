// SSE frame parsing for the coach chat stream (0.25, 09 §3).
//
// The FastAPI coach endpoint streams Server-Sent Events over an authenticated POST,
// consumed via `fetch` + `ReadableStream.getReader()` (NOT EventSource, which is
// GET-only and can't send the Authorization header). This module is the pure,
// framework-free parser: feed it decoded text chunks, get back typed frames. The
// React hook (`useChatStream`) owns the transport + rAF-throttled flushing.

/** Terminal safety tier carried on the `done`/`error` frames (03 domain). */
export type SafetyTier = "SAFE" | "MODIFY" | "STOP";

export interface Citation {
  id: string;
  label: string;
}

export type ChatFrame =
  | { type: "token"; content: string }
  | { type: "done"; citations?: Citation[]; safetyTier?: SafetyTier }
  // `subtype` distinguishes a safety STOP (terminal, non-retryable) from a technical
  // error (retryable) — the safety-critical distinction 09 §3 calls out.
  | { type: "error"; subtype: "stop" | "technical"; message: string };

/**
 * Incremental SSE parser. SSE frames are separated by a blank line (`\n\n`); each
 * frame's `data:` lines carry a JSON payload. `push()` buffers a decoded text chunk
 * and returns any COMPLETE frames it now contains, keeping the trailing partial frame
 * buffered for the next chunk.
 */
export function createSSEParser() {
  let buffer = "";

  function parseEvent(raw: string): ChatFrame | null {
    const dataLines = raw
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    if (dataLines.length === 0) return null;
    const payload = dataLines.join("\n");
    if (payload === "" || payload === "[DONE]") return null;

    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      return null; // ignore malformed frames rather than throwing mid-stream
    }
    if (typeof json !== "object" || json === null || !("type" in json)) {
      return null;
    }
    const obj = json as Record<string, unknown>;
    switch (obj.type) {
      case "token":
        return { type: "token", content: String(obj.content ?? "") };
      case "done":
        return {
          type: "done",
          citations: Array.isArray(obj.citations)
            ? (obj.citations as Citation[])
            : undefined,
          safetyTier: obj.safety_tier as SafetyTier | undefined,
        };
      case "error":
        return {
          type: "error",
          subtype: obj.subtype === "stop" ? "stop" : "technical",
          message: String(obj.message ?? "Something went wrong."),
        };
      default:
        return null;
    }
  }

  return {
    push(chunk: string): ChatFrame[] {
      buffer += chunk;
      const frames: ChatFrame[] = [];
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const frame = parseEvent(raw);
        if (frame) frames.push(frame);
        sep = buffer.indexOf("\n\n");
      }
      return frames;
    },
    /** Flush any trailing buffered frame not terminated by a blank line. */
    flush(): ChatFrame[] {
      if (buffer.trim() === "") return [];
      const frame = parseEvent(buffer);
      buffer = "";
      return frame ? [frame] : [];
    },
  };
}
