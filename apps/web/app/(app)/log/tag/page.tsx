import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TagPageClient } from "@/components/log/TagPageClient";
import { api } from "@/lib/api/client";
import type { Movement, LastResult } from "@/lib/api";

export default async function TagPage({
  searchParams,
}: {
  searchParams: Promise<{ movement_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session!.access_token;
  const { movement_id } = await searchParams;

  // When arriving from Records page (?movement_id=...), pre-fetch movement + last result
  let prefillMovement: Movement | null = null;
  let prefillLastResult: LastResult | null = null;

  if (movement_id) {
    try {
      const [movements, lastResult] = await Promise.all([
        api.movements.search(token, { q: "" }),
        api.movements.lastResult(token, movement_id).catch(() => null),
      ]);
      prefillMovement = movements.find((m) => m.id === movement_id) ?? null;
      prefillLastResult = lastResult;
    } catch {
      // Non-fatal — client will handle movement selection
    }
  }

  return (
    <TagPageClient
      accessToken={token}
      prefillMovement={prefillMovement}
      prefillLastResult={prefillLastResult}
    />
  );
}
