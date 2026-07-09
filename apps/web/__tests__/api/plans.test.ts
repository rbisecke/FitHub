import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../../lib/api/client";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("api.plans.create", () => {
  it("sends archetype field (not goal) in the request body", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ task_id: "t1", status: "pending" }), {
        status: 202,
      }),
    );
    await api.plans.create("tok", {
      archetype: "strength-bias",
      title: "Strength block",
      start_date: "2026-08-01",
      weeks: 8,
      training_age: "intermediate",
      days_per_week: 4,
      equipment: ["barbell", "rack"],
    });
    const init = spy.mock.calls[0]![1];
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body["archetype"]).toBe("strength-bias");
    expect(body).not.toHaveProperty("goal");
  });
});

describe("api.movements.getSubstitutes", () => {
  it("forwards AbortController signal to fetch", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const controller = new AbortController();
    await api.movements.getSubstitutes(
      "tok",
      "movement-uuid-123",
      ["barbell"],
      { signal: controller.signal },
    );
    const init = spy.mock.calls[0]![1];
    expect(init?.signal).toBe(controller.signal);
  });

  it("appends each equipment value as a separate query param", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    await api.movements.getSubstitutes("tok", "movement-uuid-123", [
      "barbell",
      "rings",
    ]);
    const url = String(spy.mock.calls[0]![0]);
    expect(url).toContain("equipment=barbell");
    expect(url).toContain("equipment=rings");
  });
});

describe("api.plans.getNextSession", () => {
  it("returns null on 404 instead of throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );
    const result = await api.plans.getNextSession("tok", "plan-uuid-456");
    expect(result).toBeNull();
  });

  it("forwards AbortController signal to fetch", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "s1",
          plan_id: "plan-uuid-456",
          week_number: 1,
          day_number: 1,
          session_type: "strength",
          status: "planned",
          items: [],
        }),
        { status: 200 },
      ),
    );
    const controller = new AbortController();
    await api.plans.getNextSession("tok", "plan-uuid-456", {
      signal: controller.signal,
    });
    const init = spy.mock.calls[0]![1];
    expect(init?.signal).toBe(controller.signal);
  });

  it("throws on non-404 errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    );
    await expect(
      api.plans.getNextSession("tok", "plan-uuid-456"),
    ).rejects.toThrow();
  });
});
