import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../lib/api/client";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("api.workouts.list", () => {
  it("sends Authorization header", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
      }),
    );
    await api.workouts.list("test-token");
    const call = spy.mock.calls[0]!;
    const h = call[1]?.headers as Record<string, string>;
    expect(h["Authorization"]).toBe("Bearer test-token");
  });

  it("appends before_id and limit query params", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
      }),
    );
    await api.workouts.list("tok", { beforeId: "abc", limit: 10 });
    const url = spy.mock.calls[0]![0];
    expect(String(url)).toContain("before_id=abc");
    expect(String(url)).toContain("limit=10");
  });
});

describe("api.workouts.create", () => {
  it("POSTs with JSON body", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "1", short_hash: "abcd1234" }), {
        status: 201,
      }),
    );
    await api.workouts.create("tok", {
      performed_at: "2026-06-19T09:00:00Z",
      is_tag: false,
    });
    const init = spy.mock.calls[0]![1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      performed_at: "2026-06-19T09:00:00Z",
    });
  });
});

describe("api.movements.search", () => {
  it("sends query param", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    await api.movements.search("tok", { q: "squat" });
    const url = spy.mock.calls[0]![0];
    expect(String(url)).toContain("query=squat");
  });
});
