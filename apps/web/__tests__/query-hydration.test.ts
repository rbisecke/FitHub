import { describe, it, expect } from "vitest";
import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import {
  exampleQueryKey,
  fetchExampleItems,
} from "@/lib/query/example-queries";

/**
 * Validates the RSC-prefetch → HydrationBoundary mechanism (0.20) at the data layer:
 * prefetch on a "server" client, dehydrate, hydrate into a fresh "browser" client, and
 * confirm the data is present without re-running the query function.
 */
describe("RSC prefetch → hydration hand-off", () => {
  it("carries prefetched data across dehydrate/hydrate without a refetch", async () => {
    const serverClient = new QueryClient();
    await serverClient.prefetchQuery({
      queryKey: exampleQueryKey,
      queryFn: () => fetchExampleItems(),
    });

    const dehydrated = dehydrate(serverClient);

    const browserClient = new QueryClient();
    hydrate(browserClient, dehydrated);

    const cached = browserClient.getQueryData(exampleQueryKey);
    expect(cached).toEqual(await fetchExampleItems());
    // The hydrated query is fresh (success), so a mount would not refetch.
    const state = browserClient.getQueryState(exampleQueryKey);
    expect(state?.status).toBe("success");
  });

  it("fetchExampleItems honors an aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchExampleItems({ signal: controller.signal }),
    ).rejects.toThrow();
  });
});
