import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ACWRChart } from "@/components/analytics/ACWRChart";
import { ACWRZone } from "@/components/analytics/ACWRZone";
import { FitnessCard } from "@/components/analytics/FitnessCard";
import { VolumeChart } from "@/components/analytics/VolumeChart";
import { ReadinessCard } from "@/components/analytics/ReadinessCard";
import { EmptyAnalyticsState } from "@/components/analytics/EmptyAnalyticsState";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  const [load, , volume, readiness] = await Promise.all([
    api.analytics.load(token, 90),
    api.analytics.personalRecords(token),
    api.analytics.volumeTrend(token, 12),
    api.analytics.readiness(token),
  ]);

  const nonZeroDays = load.series.filter((pt) => pt.load_au > 0).length;
  const hasEnoughData = nonZeroDays >= 7;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">
          <span className="font-mono text-zinc-500 mr-2 text-sm">$</span>
          git diff --stat
        </h1>
        <ACWRZone zone={load.acwr_zone} acwr={load.acwr_now} />
      </div>

      {!hasEnoughData ? (
        <EmptyAnalyticsState />
      ) : (
        <>
          <ReadinessCard data={readiness} />

          <section>
            <p className="mb-2 font-mono text-xs text-zinc-500">
              Acute:Chronic Workload Ratio
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <ACWRChart series={load.series} />
            </div>
          </section>

          <FitnessCard
            ctl={load.ctl_now}
            atl={load.atl_now}
            tsb={load.tsb_now}
          />

          <section>
            <p className="mb-2 font-mono text-xs text-zinc-500">
              Weekly volume by session type
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <VolumeChart weeks={volume.weeks} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
