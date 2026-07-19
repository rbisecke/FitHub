// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatStream, parseFrame } from "@/hooks/use-chat-stream";

/** Build a Response whose body streams the given SSE frame strings. */
function mockStreamResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

const baseOptions = {
  url: "https://api.test/coach/stream",
  getToken: () => "test-jwt",
  synchronousFlush: true,
};

describe("parseFrame", () => {
  it("parses token, done, and error frames", () => {
    expect(parseFrame(sse({ type: "token", text: "hi" }))).toEqual({
      type: "token",
      text: "hi",
    });
    expect(parseFrame(sse({ type: "done" }))).toEqual({ type: "done" });
    expect(
      parseFrame(sse({ type: "error", subtype: "stop", message: "no" })),
    ).toEqual({ type: "error", subtype: "stop", message: "no" });
  });

  it("ignores malformed frames", () => {
    expect(parseFrame("data: {not json")).toBeNull();
    expect(parseFrame("ping")).toBeNull();
  });
});

describe("useChatStream", () => {
  it("accumulates tokens and finishes with status 'done'", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([
        sse({ type: "token", text: "Hello" }),
        sse({ type: "token", text: ", world" }),
        sse({ type: "done" }),
      ]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );

    await act(async () => {
      await result.current.send("hi");
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.text).toBe("Hello, world");
  });

  it("sends an Authorization bearer header and idempotency key", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([sse({ type: "done" })]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("hi");
    });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const init = call?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-jwt");
    expect(headers["Idempotency-Key"]).toBeTruthy();
    expect(init.method).toBe("POST");
    // AbortController signal forwarded to the fetch (apps/web/CLAUDE.md).
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("treats a STOP error as terminal 'stopped' and preserves text", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([
        sse({ type: "token", text: "partial answer" }),
        sse({ type: "error", subtype: "stop", message: "Safety stop" }),
      ]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("risky");
    });

    await waitFor(() => expect(result.current.status).toBe("stopped"));
    expect(result.current.text).toBe("partial answer");
    expect(result.current.error).toBe("Safety stop");
  });

  it("treats a technical error as retryable 'error'", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([
        sse({ type: "token", text: "x" }),
        sse({ type: "error", subtype: "technical", message: "boom" }),
      ]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("hi");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.text).toBe("x");
    expect(result.current.error).toBe("boom");
  });

  it("surfaces a non-ok response as an error", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 429 }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("hi");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toContain("429");
  });
});
