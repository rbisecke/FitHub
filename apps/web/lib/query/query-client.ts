import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

/**
 * QueryClient factory + RSC-safe accessor (0.19, 09 §6).
 *
 * The RSC-prefetch → HydrationBoundary hand-off (0.20) needs one QueryClient per
 * request on the server and a single long-lived client in the browser. `getQueryClient`
 * implements exactly that: a fresh client server-side (never shared across requests, so
 * one user's data can't leak into another's), a memoized singleton client-side.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With RSC we prefetch on the server; a non-zero staleTime stops an immediate
        // client refetch of data that was just server-rendered.
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Dehydrate pending queries too, so streaming prefetches hand off cleanly.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always a brand-new client so requests never share cache state.
    return makeQueryClient();
  }
  // Browser: reuse one client across the app's lifetime.
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
