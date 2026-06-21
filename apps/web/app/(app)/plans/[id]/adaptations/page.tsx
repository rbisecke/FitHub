import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { AdaptationCard } from "@/components/adaptations/AdaptationCard";
import type { AdaptationOut } from "@/lib/api/plans";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdaptationsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let adaptations: AdaptationOut[] = [];
  try {
    adaptations = await api.adaptations.list(session.access_token, id);
  } catch {
    notFound();
  }

  const proposed = adaptations.filter((a) => a.status === "proposed");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        $ git diff — proposed changes
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        # adaptation pull requests — review and merge or reject
      </p>

      {proposed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-10 text-center">
          <p className="font-mono text-zinc-500">
            # no pending adaptations — your plan is on track
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {proposed.map((adaptation) => (
            <AdaptationCard
              key={adaptation.id}
              adaptation={adaptation}
              accessToken={session.access_token}
            />
          ))}
        </div>
      )}
    </div>
  );
}
