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

  it("stops on abort — preserves partial text and lands on 'aborted', not 'idle'", async () => {
    // A real fetch ties its response body stream to the AbortSignal, so
    // aborting mid-stream rejects any pending reader.read() — simulate that
    // by erroring the stream's controller when the signal fires, rather than
    // ever closing the stream normally.
    const encoder = new TextEncoder();
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null =
      null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
        controller.enqueue(
          encoder.encode(sse({ type: "token", text: "partial" })),
        );
      },
    });

    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      init?.signal?.addEventListener("abort", () => {
        controllerRef?.error(new DOMException("Aborted", "AbortError"));
      });
      return Promise.resolve(new Response(stream, { status: 200 }));
    }) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );

    act(() => {
      void result.current.send("hi");
    });
    await waitFor(() => expect(result.current.text).toBe("partial"));

    act(() => {
      result.current.abort();
    });

    await waitFor(() => expect(result.current.status).toBe("aborted"));
    expect(result.current.text).toBe("partial");
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
    expect(result.current.httpStatus).toBe(429);
    expect(result.current.errorSubtype).toBe("technical");
  });

  it("surfaces the backend's JSON `detail` on a non-ok response (kill-switch copy)", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            detail:
              "AI coaching is temporarily suspended. Please try again later.",
          }),
          { status: 503 },
        ),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("hi");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.httpStatus).toBe(503);
    expect(result.current.error).toBe(
      "AI coaching is temporarily suspended. Please try again later.",
    );
  });

  it("sends { question, session_id } — not the old { message } shape", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([sse({ type: "done" })]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("How's my ACWR?", "session-123");
    });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const init = call?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      question: "How's my ACWR?",
      session_id: "session-123",
    });
  });

  it("omits session_id entirely for a brand-new thread", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([sse({ type: "done" })]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("Suggest a deload");
    });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const init = call?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ question: "Suggest a deload" });
  });

  it("captures session_id, citations, and safety_tier from the done frame", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([
        sse({ type: "token", text: "Take a deload week." }),
        sse({
          type: "done",
          session_id: "abc-123",
          citations: [
            { title: "Deload guidance", source_type: "article", score: 0.9 },
          ],
          safety_tier: "coach",
          stub: false,
        }),
      ]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("Suggest a deload");
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.sessionId).toBe("abc-123");
    expect(result.current.citations).toEqual([
      { title: "Deload guidance", source_type: "article", score: 0.9 },
    ]);
    expect(result.current.safetyTier).toBe("coach");
    expect(result.current.stub).toBe(false);
  });

  it("captures stub:true from the done frame", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([
        sse({ type: "token", text: "stub answer" }),
        sse({
          type: "done",
          session_id: "abc-123",
          citations: [],
          safety_tier: "coach",
          stub: true,
        }),
      ]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("hi");
    });

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.stub).toBe(true);
  });

  it("captures session_id from a STOP-tier error frame (fresh-thread escalation)", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([
        sse({
          type: "error",
          subtype: "stop",
          message: "Please stop and seek medical attention.",
          session_id: "new-session-999",
        }),
      ]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("I have severe chest pain");
    });

    await waitFor(() => expect(result.current.status).toBe("stopped"));
    expect(result.current.sessionId).toBe("new-session-999");
  });

  it("treats a stream that closes with no done/error frame as a retryable error", async () => {
    const fetchImpl = vi.fn(async () =>
      mockStreamResponse([sse({ type: "token", text: "partial" })]),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useChatStream({ ...baseOptions, fetchImpl }),
    );
    await act(async () => {
      await result.current.send("hi");
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.text).toBe("partial");
    expect(result.current.errorSubtype).toBe("technical");
  });
});
