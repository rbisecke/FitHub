import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { StrengthProgressSection } from "@/components/analytics/StrengthProgressSection";
import { VolumeTrendSection } from "@/components/analytics/VolumeTrendSection";
import { TrainingBalanceSection } from "@/components/analytics/TrainingBalanceSection";
import { BenchmarkProgressSection } from "@/components/analytics/BenchmarkProgressSection";
import { PRSummaryStrip } from "@/components/analytics/PRSummaryStrip";
import { ACWRChart } from "@/components/analytics/ACWRChart";
import { EmptyAnalyticsState } from "@/components/analytics/EmptyAnalyticsState";
import { PerformanceCards } from "@/components/analytics/PerformanceCards";
import { ZoneBanner } from "@/components/analytics/ZoneBanner";
import { PageHeader } from "@/components/ui/page-header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import type { DailyLoadPoint } from "@/lib/api";

function getCtlTrend(
  ctlNow: number,
  series: DailyLoadPoint[],
): { direction: "up" | "down" | "flat"; label: string } {
  if (series.length < 7)
    return { direction: "flat", label: "Stable vs last week" };
  const weekAgo = series[Math.max(0, series.length - 7)];
  const diff = ctlNow - (weekAgo?.ctl ?? ctlNow);
  if (diff > 1)
    return { direction: "up", label: `+${diff.toFixed(1)} vs last week` };
  if (diff < -1)
    return { direction: "down", label: `${diff.toFixed(1)} vs last week` };
  return { direction: "flat", label: "Stable vs last week" };
}

function getAtlTrend(
  atlNow: number,
  series: DailyLoadPoint[],
): { direction: "up" | "down" | "flat"; label: string } {
  if (series.length < 7)
    return { direction: "flat", label: "Stable vs last week" };
  const weekAgo = series[Math.max(0, series.length - 7)];
  const diff = atlNow - (weekAgo?.atl ?? atlNow);
  if (diff > 1)
    return { direction: "up", label: `+${diff.toFixed(1)} vs last week` };
  if (diff < -1)
    return { direction: "down", label: `${diff.toFixed(1)} vs last week` };
  return { direction: "flat", label: "Stable vs last week" };
}

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

  const ctlTrend = getCtlTrend(load.ctl_now, load.series);
  const atlTrend = getAtlTrend(load.atl_now, load.series);
  const tsbIsNeg = load.tsb_now < 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        gitCommand="$ git diff"
        title="Analytics"
        sub="Your performance science dashboard"
      />

      {nonZeroDays < 7 ? (
        <EmptyAnalyticsState />
      ) : (
        <div className="animate-fadeUp space-y-0">
          {/* CTL / ATL / TSB cards */}
          <PerformanceCards
            ctl={{
              label: "Fitness (CTL)",
              value: Math.round(load.ctl_now),
              sub: "chronic training load",
              trendDirection: ctlTrend.direction,
              trendValue: ctlTrend.label,
            }}
            atl={{
              label: "Fatigue (ATL)",
              value: Math.round(load.atl_now),
              sub: "acute training load",
              trendDirection: atlTrend.direction,
              trendValue: atlTrend.label,
            }}
            tsb={{
              label: "Form (TSB)",
              value: Math.round(load.tsb_now),
              sub: "fitness minus fatigue",
              trendDirection: tsbIsNeg ? "down" : "up",
              trendValue: "",
              valueIsNegative: tsbIsNeg,
            }}
          />

          {/* Zone banner */}
          <ZoneBanner zone={load.acwr_zone} acwr={load.acwr_now} />

          {/* 2-col grid for md+; single col on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="col-span-1 md:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-5 group">
                  <div>
                    <p className="text-[15px] font-bold text-[var(--foreground)] text-left">
                      Acute : Chronic Workload Ratio
                    </p>
                    <p className="text-[12px] text-[var(--muted-foreground)] text-left">
                      7-day load vs 28-day load — the injury-risk gauge
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {load.acwr_now !== null && (
                      <div className="text-right">
                        <div
                          className="font-heading text-[20px] leading-none"
                          style={{
                            color:
                              load.acwr_zone === "overreaching"
                                ? "var(--hot)"
                                : load.acwr_zone === "caution"
                                  ? "var(--gold)"
                                  : "var(--accent)",
                          }}
                        >
                          {load.acwr_now.toFixed(2)}
                        </div>
                        <div
                          className="text-[10.5px] mt-0.5"
                          style={{
                            color:
                              load.acwr_zone === "overreaching"
                                ? "var(--hot)"
                                : load.acwr_zone === "caution"
                                  ? "var(--gold)"
                                  : "var(--accent)",
                          }}
                        >
                          {load.acwr_zone === "sweet_spot"
                            ? "optimal"
                            : load.acwr_zone === "undertraining"
                              ? "low"
                              : load.acwr_zone === "caution"
                                ? "caution"
                                : load.acwr_zone === "overreaching"
                                  ? "high risk"
                                  : "calibrating"}
                        </div>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-data-[state=open]:rotate-90" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 space-y-2">
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
        </div>
      )}
    </div>
  );
}
