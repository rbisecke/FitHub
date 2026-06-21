"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { AdaptationOut } from "@/lib/api/plans";

interface Props {
  accessToken: string;
  planId: string;
}

export function AdaptationBanner({ accessToken, planId }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    api.adaptations
      .list(accessToken, planId)
      .then((adaptations: AdaptationOut[]) => {
        const proposed = adaptations.filter((a) => a.status === "proposed");
        setCount(proposed.length);
      })
      .catch(() => setCount(0));
  }, [accessToken, planId]);

  if (count === null || count === 0) return null;

  return (
    <Link
      href={`/plans/${planId}/adaptations`}
      data-testid="adaptation-banner"
      className="flex items-center gap-2 rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-2 font-mono text-xs text-yellow-300 hover:border-yellow-700"
    >
      <span className="rounded bg-yellow-700 px-1.5 py-0.5 text-yellow-100">
        {count}
      </span>
      review pending changes →
    </Link>
  );
}
