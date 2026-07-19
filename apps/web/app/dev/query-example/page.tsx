import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";
import {
  exampleQueryKey,
  fetchExampleItems,
} from "@/lib/query/example-queries";
import { ExampleList } from "./example-list";

/**
 * Scaffold route — worked example of the RSC-prefetch → HydrationBoundary hand-off
 * (0.20, 09 §6). Server Component prefetches on a per-request QueryClient, dehydrates,
 * and hands the cache to the client via HydrationBoundary. Delete once real domain
 * screens establish the pattern in later Efforts.
 */
export default async function QueryExamplePage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: exampleQueryKey,
    queryFn: ({ signal }) => fetchExampleItems({ signal }),
  });

  return (
    <main
      className="min-h-screen p-6"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="type-h1">RSC prefetch → HydrationBoundary</h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ExampleList />
        </HydrationBoundary>
      </div>
    </main>
  );
}
