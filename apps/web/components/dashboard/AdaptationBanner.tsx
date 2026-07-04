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
      className="flex items-center gap-2 rounded-lg bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.40)] px-4 py-2 hover:brightness-105 transition-[filter]"
    >
      <span className="font-data text-[11px] text-[var(--muted)]">
        $ git diff --plan ·
      </span>
      <span className="font-data text-[11px] font-bold rounded px-[6px] py-[2px] bg-[var(--amber)] text-[#0d1117]">
        {count}
      </span>
      <span className="font-data text-[12px] text-[var(--amber)]">
        adaptations pending review →
      </span>
    </Link>
  );
}
