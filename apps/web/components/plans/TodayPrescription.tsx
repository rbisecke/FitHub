"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { PlannedSessionOut, ModifyWorkoutResponse } from "@/lib/api/plans";
import { WorkoutModifications } from "@/components/injuries/WorkoutModifications";

interface Props {
  accessToken: string;
  planId: string;
}

export function TodayPrescription({ accessToken, planId }: Props) {
  const [session, setSession] = useState<PlannedSessionOut | null | undefined>(
    undefined,
  );
  const [modifications, setModifications] =
    useState<ModifyWorkoutResponse | null>(null);
  const [modLoading, setModLoading] = useState(false);

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
      <div className="mt-3 flex items-center gap-3">
        <Link
          href={`/plans/${planId}`}
          className="font-mono text-xs text-indigo-400 hover:text-indigo-300"
        >
          view plan →
        </Link>
        {session.items.length > 0 && (
          <button
            data-testid="modify-workout-btn"
            disabled={modLoading}
            onClick={async () => {
              setModLoading(true);
              try {
                const result = await api.coach.modifyWorkout(
                  accessToken,
                  session.id,
                );
                setModifications(result);
              } finally {
                setModLoading(false);
              }
            }}
            className="font-mono text-xs text-amber-500 hover:text-amber-400 disabled:opacity-40"
          >
            {modLoading ? "checking…" : "$ modify --injuries"}
          </button>
        )}
      </div>
      {modifications && (
        <div className="mt-4">
          <WorkoutModifications
            modifications={modifications.modifications}
            safeMovements={modifications.safe_movements}
            anyReferralRequired={modifications.any_referral_required}
            referralRegions={modifications.referral_regions}
          />
        </div>
      )}
    </div>
  );
}
