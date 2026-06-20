"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { PlannedSessionOut } from "@/lib/api/plans";

interface Props {
  accessToken: string;
  planId: string;
}

export function TodayPrescription({ accessToken, planId }: Props) {
  const [session, setSession] = useState<PlannedSessionOut | null | undefined>(
    undefined,
  );

  useEffect(() => {
    api.plans
      .today(accessToken, planId)
      .then((data) => {
        if (data && typeof data === "object" && "id" in data) {
          setSession(data as PlannedSessionOut);
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));
  }, [accessToken, planId]);

  if (session === undefined) {
    return (
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
      >
        <p className="font-mono text-xs text-zinc-600">loading today…</p>
      </div>
    );
  }

  if (session === null) {
    return (
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
      >
        <p className="font-mono text-xs text-zinc-500"># rest day</p>
      </div>
    );
  }

  return (
    <div
      data-testid="today-prescription"
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <p className="mb-1 font-mono text-xs text-zinc-500">$ today</p>
      <p className="font-semibold text-zinc-100">{session.title}</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {session.session_type} · {session.items.length} movements
      </p>
      {session.items.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {session.items.slice(0, 3).map((item) => (
            <li key={item.id} className="font-mono text-xs text-zinc-400">
              {item.movement_name}
              {item.sets && item.reps ? ` ${item.sets}×${item.reps}` : ""}
            </li>
          ))}
          {session.items.length > 3 && (
            <li className="font-mono text-xs text-zinc-600">
              +{session.items.length - 3} more
            </li>
          )}
        </ul>
      )}
      <Link
        href={`/plans/${planId}`}
        className="mt-3 inline-block font-mono text-xs text-indigo-400 hover:text-indigo-300"
      >
        view plan →
      </Link>
    </div>
  );
}
