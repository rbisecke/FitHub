import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { TrainingSummaryHero } from "@/components/analytics/TrainingSummaryHero";
import { StrengthProgressSection } from "@/components/analytics/StrengthProgressSection";
import { VolumeTrendSection } from "@/components/analytics/VolumeTrendSection";
import { TrainingBalanceSection } from "@/components/analytics/TrainingBalanceSection";
import { BenchmarkProgressSection } from "@/components/analytics/BenchmarkProgressSection";
import { PRSummaryStrip } from "@/components/analytics/PRSummaryStrip";
import { ACWRChart } from "@/components/analytics/ACWRChart";
import { EmptyAnalyticsState } from "@/components/analytics/EmptyAnalyticsState";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  const [load, personalRecords, volume, , balance, benchmarks] =
    await Promise.all([
      api.analytics.load(token, 90),
      api.analytics.personalRecords(token),
      api.analytics.volumeTrend(token, 8),
      api.analytics.readiness(token),
      api.analytics.trainingBalance(token, 28).catch(() => null),
      api.analytics.benchmarks(token).catch(() => null),
    ]);

  const nonZeroDays = load.series.filter((pt) => pt.load_au > 0).length;
  const isCalibrating = nonZeroDays < 14;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-[--text]">
          <span className="font-mono text-[--muted] mr-2 text-sm">$</span>
          git diff · Progress
        </h1>
        <p className="text-sm text-[--muted] mt-0.5">
          How you&apos;ve progressed
        </p>
      </div>

      {nonZeroDays < 7 ? (
        <EmptyAnalyticsState />
      ) : (
        <>
          {/* 2-col grid for md+; single col on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hero — full width */}
            <TrainingSummaryHero
              ctlNow={load.ctl_now}
              atlNow={load.atl_now}
              tsbNow={load.tsb_now}
              acwrNow={load.acwr_now}
              acwrZone={load.acwr_zone}
              isCalibrating={isCalibrating}
              series={load.series}
              className="col-span-1 md:col-span-2"
            />

            {/* Strength Progress */}
            <StrengthProgressSection
              personalRecords={personalRecords}
              token={token}
            />

            {/* Volume Trend */}
            <VolumeTrendSection initialWeeks={volume.weeks} token={token} />

            {/* Training Balance */}
            <TrainingBalanceSection data={balance} />

            {/* Benchmark WODs */}
            <BenchmarkProgressSection data={benchmarks} />

            {/* Load detail (ACWR chart) — collapsed by default */}
            <div className="col-span-1 md:col-span-2 rounded-lg border border-[--border] bg-[--surface]">
              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-sm font-medium text-[--text] group">
                  Load detail · last 90 days
                  <ChevronRight className="h-4 w-4 text-[--muted] transition-transform group-data-[state=open]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2">
                    <p className="text-xs text-[--muted]">
                      Acute:Chronic Workload Ratio — optimal zone is 0.8–1.3
                    </p>
                    <ACWRChart series={load.series} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* PR Summary Strip — full width */}
            <PRSummaryStrip
              records={personalRecords}
              className="col-span-1 md:col-span-2"
            />
          </div>
        </>
      )}
    </div>
  );
}
