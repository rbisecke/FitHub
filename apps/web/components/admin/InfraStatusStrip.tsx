"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { AdminInfraSnapshot } from "@/lib/api";
import { InfraStatusBar } from "./InfraStatusBar";

/** Client-side timebox for the infra status call (`08` §4). */
const TIMEOUT_MS = 2500;

/**
 * Wires the real data fetch for the pinned infra status strip (`08` §4). The
 * presentational `InfraStatusBar` just renders whatever `snapshots` it's given;
 * this component owns the `GET /api/v1/admin/infra/status` call, client-side
 * timeboxed to 2.5s via `AbortController` (not a bare `Promise.race`, per the
 * project frontend rules).
 *
 * On timeout OR any fetch failure, this silently degrades to an empty
 * snapshot list — `InfraStatusBar` already renders a missing source as
 * "unknown" for each of the three cells, so that's a normal, non-alarming
 * state here, not an error UI. The call never blocks the page: the strip
 * mounts under the same layout as the rest of the console regardless of
 * whether this effect has resolved yet.
 */
export function InfraStatusStrip({ accessToken }: { accessToken: string }) {
  const [snapshots, setSnapshots] = useState<AdminInfraSnapshot[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    api.admin
      .infraStatus(accessToken, { signal: controller.signal })
      .then((snaps) => {
        if (!cancelled) setSnapshots(snaps);
      })
      .catch(() => {
        // Timeout or failure — degrade to all-three-"unknown" (08 §4).
        if (!cancelled) setSnapshots([]);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [accessToken]);

  return <InfraStatusBar snapshots={snapshots} />;
}
