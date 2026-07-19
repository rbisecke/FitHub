/**
 * Worked-example query definitions for the RSC-prefetch → HydrationBoundary pattern
 * (0.20, 09 §6). Real domain queries live in their domain folders in later Efforts;
 * this pair exists so the hand-off pattern has one concrete, testable reference.
 */

export interface ExampleItem {
  id: string;
  label: string;
}

export const exampleQueryKey = ["dev", "example-items"] as const;

/**
 * Stand-in for a FastAPI fetch. Deterministic so the pattern is testable without a
 * network. Accepts an AbortSignal to model the real fetch contract (apps/web/CLAUDE.md).
 */
export async function fetchExampleItems(opts?: {
  signal?: AbortSignal;
}): Promise<ExampleItem[]> {
  opts?.signal?.throwIfAborted();
  return [
    { id: "a1", label: "Prefetched on the server" },
    { id: "b2", label: "Hydrated into the client cache" },
    { id: "c3", label: "No client refetch on first paint" },
  ];
}
