"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/client";
import { AdaptationCard } from "@/components/adaptations/AdaptationCard";
import type { AdaptationOut } from "@/lib/api/plans";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdaptationsPage({ params }: Props) {
  const router = useRouter();
  const [planId, setPlanId] = useState<string | null>(null);
  const [adaptations, setAdaptations] = useState<AdaptationOut[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { id } = await params;
      if (cancelled) return;
      setPlanId(id);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      setAccessToken(session.access_token);
      try {
        const all = await api.adaptations.list(session.access_token, id);
        if (!cancelled)
          setAdaptations(all.filter((a) => a.status === "proposed"));
      } catch {
        if (!cancelled) router.replace("/404");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRevised(newAdaptation: AdaptationOut) {
    setAdaptations((prev) => [newAdaptation, ...prev]);
  }

  if (loading || !accessToken || !planId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="font-mono text-xs text-zinc-600">
          # loading adaptations…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        $ git diff — proposed changes
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        # adaptation pull requests — review and merge or reject
      </p>

      {adaptations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-10 text-center">
          <p className="font-mono text-zinc-500">
            # no pending adaptations — your plan is on track
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {adaptations.map((adaptation) => (
            <AdaptationCard
              key={adaptation.id}
              adaptation={adaptation}
              accessToken={accessToken}
              onRevised={handleRevised}
            />
          ))}
        </div>
      )}
    </div>
  );
}
