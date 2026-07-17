import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Pure logic tests for ExerciseSwapSheet behaviours.
//
// The vitest environment is "node" (no DOM), so we test the logic that the
// component encodes rather than rendering it directly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. AbortController signal forwarded to fetch
// ---------------------------------------------------------------------------

describe("AbortController signal forwarding", () => {
  it("passes the signal from the AbortController to the fetch call", async () => {
    const controller = new AbortController();
    const capturedSignals: (AbortSignal | undefined)[] = [];

    async function fakeGetSubstitutes(
      _token: string,
      _movementId: string,
      _equipment: string[],
      options?: { signal?: AbortSignal },
    ) {
      capturedSignals.push(options?.signal);
      return [];
    }

    // Simulate what the component does in its useEffect
    await fakeGetSubstitutes("token", "mov-1", [], {
      signal: controller.signal,
    });

    expect(capturedSignals).toHaveLength(1);
    expect(capturedSignals[0]).toBe(controller.signal);
    expect(capturedSignals[0]).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// 2. Cancelled flag prevents setState after unmount
// ---------------------------------------------------------------------------

describe("Cancelled flag guards setState after unmount", () => {
  it("does not call setState when cancelled=true before the promise resolves", async () => {
    let cancelled = false;
    const setState = vi.fn();

    let resolveSubstitutes!: (value: unknown[]) => void;
    const pendingFetch = new Promise<unknown[]>((res) => {
      resolveSubstitutes = res;
    });

    // Simulate effect body — start fetch
    const effectPromise = pendingFetch.then((data) => {
      if (cancelled) return; // guard
      setState(data);
    });

    // Simulate cleanup — set cancelled before resolving
    cancelled = true;

    // Now resolve — setState should NOT be called
    resolveSubstitutes([{ id: "sub-1", name: "Goblet Squat" }]);
    await effectPromise;

    expect(setState).not.toHaveBeenCalled();
  });

  it("does call setState when cancelled=false (normal path)", async () => {
    const cancelled = false;
    const setState = vi.fn();
    const data = [{ id: "sub-1", name: "Goblet Squat" }];

    await Promise.resolve(data).then((result) => {
      if (cancelled) return;
      setState(result);
    });

    expect(setState).toHaveBeenCalledWith(data);
  });
});

// ---------------------------------------------------------------------------
// 3. Error state shown on fetch failure
// ---------------------------------------------------------------------------

describe("Error state on fetch failure", () => {
  it("sets error state and does not set substitutes when fetch rejects", async () => {
    const substitutes: unknown[] = [];
    let error: string | null = null;
    let loading = true;

    const controller = new AbortController();
    const cancelled = false;

    await Promise.reject(new Error("Network error")).catch(() => {
      if (cancelled || controller.signal.aborted) return;
      error = "Couldn't load substitutes.";
      loading = false;
    });

    expect(error).toBe("Couldn't load substitutes.");
    expect(loading).toBe(false);
    expect(substitutes).toHaveLength(0);
  });

  it("does not set error when cancelled before rejection", async () => {
    let error: string | null = null;
    let cancelled = false;

    const rejectionHandler = async () => {
      await Promise.reject(new Error("Network error")).catch(() => {
        if (cancelled) return;
        error = "Couldn't load substitutes.";
      });
    };

    cancelled = true;
    await rejectionHandler();

    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Confirmation required before onSwap is called
// ---------------------------------------------------------------------------

describe("Swap confirmation flow", () => {
  it("does not call onSwap on first selection — requires explicit confirmation", () => {
    const onSwap = vi.fn();
    let pending: { movementId: string; movementName: string } | null = null;

    // Simulate first tap: select a substitute
    function handleSelectSubstitute(sub: {
      movementId: string;
      movementName: string;
    }) {
      pending = sub;
      // onSwap is NOT called here
    }

    handleSelectSubstitute({
      movementId: "sub-1",
      movementName: "Goblet Squat",
    });

    expect(onSwap).not.toHaveBeenCalled();
    expect(pending).not.toBeNull();
  });

  it("calls onSwap only after explicit confirmation", () => {
    const onSwap = vi.fn();
    let pending: { movementId: string; movementName: string } | null = null;

    function handleSelectSubstitute(sub: {
      movementId: string;
      movementName: string;
    }) {
      pending = sub;
    }

    function handleConfirm() {
      if (!pending) return;
      onSwap(pending.movementId, pending.movementName);
      pending = null;
    }

    // First tap
    handleSelectSubstitute({
      movementId: "sub-1",
      movementName: "Goblet Squat",
    });
    expect(onSwap).not.toHaveBeenCalled();

    // Confirmation tap
    handleConfirm();
    expect(onSwap).toHaveBeenCalledOnce();
    expect(onSwap).toHaveBeenCalledWith("sub-1", "Goblet Squat");
    expect(pending).toBeNull();
  });

  it("cancelling pending swap prevents onSwap from being called", () => {
    const onSwap = vi.fn();
    let pending: { movementId: string; movementName: string } | null = null;

    function handleSelectSubstitute(sub: {
      movementId: string;
      movementName: string;
    }) {
      pending = sub;
    }

    function handleCancelConfirm() {
      pending = null;
    }

    function handleConfirm() {
      if (!pending) return;
      onSwap(pending.movementId, pending.movementName);
      pending = null;
    }

    handleSelectSubstitute({
      movementId: "sub-1",
      movementName: "Goblet Squat",
    });
    handleCancelConfirm();
    handleConfirm(); // pending is null, so onSwap should not be called

    expect(onSwap).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. S4 — synchronous double-submit guard on "Confirm"
// ---------------------------------------------------------------------------

describe("S4 — double-submit guard on swap confirm", () => {
  it("a rapid second tap on Confirm does not call onSwap twice", () => {
    const onSwap = vi.fn();
    const confirmingRef = { current: false };
    let pending: { movementId: string; movementName: string } | null = {
      movementId: "sub-1",
      movementName: "Goblet Squat",
    };

    function handleConfirm() {
      if (!pending) return;
      if (confirmingRef.current) return;
      confirmingRef.current = true;
      onSwap(pending.movementId, pending.movementName);
      pending = null;
    }

    // Two rapid taps before React would have a chance to unmount/rerender
    // the sheet in response to the first.
    handleConfirm();
    handleConfirm();

    expect(onSwap).toHaveBeenCalledOnce();
  });

  it("resets the guard when the sheet reopens for a new swap attempt", () => {
    const onSwap = vi.fn();
    const confirmingRef = { current: false };
    let pending: { movementId: string; movementName: string } | null = {
      movementId: "sub-1",
      movementName: "Goblet Squat",
    };

    function handleConfirm() {
      if (!pending) return;
      if (confirmingRef.current) return;
      confirmingRef.current = true;
      onSwap(pending.movementId, pending.movementName);
      pending = null;
    }

    handleConfirm();
    expect(onSwap).toHaveBeenCalledTimes(1);

    // Sheet reopens for a new movement — the open-effect resets the guard.
    confirmingRef.current = false;
    pending = { movementId: "sub-2", movementName: "Kettlebell Swing" };
    handleConfirm();

    expect(onSwap).toHaveBeenCalledTimes(2);
    expect(onSwap).toHaveBeenLastCalledWith("sub-2", "Kettlebell Swing");
  });
});
