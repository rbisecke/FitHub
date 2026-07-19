"use client";

import { useQuery } from "@tanstack/react-query";
import {
  exampleQueryKey,
  fetchExampleItems,
} from "@/lib/query/example-queries";

/**
 * Client consumer for the hydration hand-off (0.20). Because the parent Server
 * Component prefetched this exact query key and dehydrated it into a HydrationBoundary,
 * `useQuery` reads the data straight from the hydrated cache — no loading flash, no
 * refetch on first paint — then owns polling/invalidation from here on.
 */
export function ExampleList() {
  const { data } = useQuery({
    queryKey: exampleQueryKey,
    queryFn: ({ signal }) => fetchExampleItems({ signal }),
  });

  return (
    <ul className="flex flex-col gap-2">
      {(data ?? []).map((item) => (
        <li
          key={item.id}
          className="type-body rounded-md border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
