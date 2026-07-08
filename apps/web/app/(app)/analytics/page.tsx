import { requireAuth } from "@/lib/supabase/requireAuth";
import { getLoadTrend } from "@/lib/analytics/load-trend";
import { BackButton } from "@/components/ui/BackButton";
import { api } from "@/lib/api/client";
import { StrengthProgressSection } from "@/components/analytics/StrengthProgressSection";
import { VolumeTrendSection } from "@/components/analytics/VolumeTrendSection";
import { TrainingBalanceSection } from "@/components/analytics/TrainingBalanceSection";
import { BenchmarkProgressSection } from "@/components/analytics/BenchmarkProgressSection";
import { TrainingPartnersPanel } from "@/components/analytics/TrainingPartnersPanel";
import { PRSummaryStrip } from "@/components/analytics/PRSummaryStrip";
import { MobileStrengthTrendCard } from "@/components/analytics/MobileStrengthTrendCard";
import { ACWRChart } from "@/components/analytics/ACWRChart";
import { EmptyAnalyticsState } from "@/components/analytics/EmptyAnalyticsState";
import { PerformanceCards } from "@/components/analytics/PerformanceCards";
import { ZoneBanner } from "@/components/analytics/ZoneBanner";
import { ReadinessCard } from "@/components/analytics/ReadinessCard";
import { PageHeader } from "@/components/ui/page-header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import type { TrainingPartner } from "@/lib/api";

export default async function AnalyticsPage() {
  const { token } = await requireAuth();

  const [
    loadRes,
    personalRecordsRes,
    volumeRes,
    readinessRes,
    balanceRes,
    benchmarksRes,
    partnersRes,
    profileRes,
  ] = await Promise.allSettled([
    api.analytics.load(token, 90),
    api.analytics.personalRecords(token),
    api.analytics.volumeTrend(token, 8),
    api.analytics.readiness(token),
    api.analytics.trainingBalance(token, 28),
    api.analytics.benchmarks(token),
    api.trainingPartners(token),
    api.profile.get(token),
  ]);

  const load =
    loadRes.status === "fulfilled"
      ? loadRes.value
      : {
          series: [],
          ctl_now: 0,
          atl_now: 0,
          tsb_now: 0,
          acwr_now: null,
          acwr_zone: "insufficient_data" as const,
        };
  const personalRecords =
    personalRecordsRes.status === "fulfilled" ? personalRecordsRes.value : [];
  const volume =
    volumeRes.status === "fulfilled" ? volumeRes.value : { weeks: [] };
  const readiness =
    readinessRes.status === "fulfilled" ? readinessRes.value : null;
  const balance = balanceRes.status === "fulfilled" ? balanceRes.value : null;
  const benchmarks =
    benchmarksRes.status === "fulfilled" ? benchmarksRes.value : null;
  const partners: TrainingPartner[] =
    partnersRes.status === "fulfilled" ? partnersRes.value : [];
  const weightUnit =
    profileRes.status === "fulfilled"
      ? profileRes.value.weight_unit ?? "kg"
      : "kg";

  const nonZeroDays = load.series.filter((pt) => pt.load_au > 0).length;

  const ctlTrend = getLoadTrend(load.ctl_now, load.series, "ctl");
  const atlTrend = getLoadTrend(load.atl_now, load.series, "atl");
  const tsbIsNeg = load.tsb_now < 0;

  return (
    <div className="px-[18px] pt-[14px] pb-2 md:p-6 max-w-5xl mx-auto">
      <BackButton
        href="/dashboard"
        label="Home"
        className="md:hidden mb-[14px]"
      />

      <PageHeader
        gitCommand="$ git diff --stat HEAD~8w"
        title="Analytics"
        sub="How your training has changed over the last 8 weeks."
      />

      {nonZeroDays < 7 ? (
        <EmptyAnalyticsState />
      ) : (
        <div className="animate-fadeUp space-y-0">
          {/* Mobile: compact 3-col metric strip */}
          <div className="md:hidden flex gap-[8px] mb-[12px]">
            {[
              {
                label: "Fitness",
                value: Math.round(load.ctl_now),
                color: "var(--foreground)",
                sub: "CTL",
              },
              {
                label: "Fatigue",
                value: Math.round(load.atl_now),
                color: "var(--hot)",
                sub: "ATL",
              },
              {
                label: "Form",
                value: Math.round(load.tsb_now),
                color: "var(--gold)",
                sub: "TSB",
              },
            ].map((m) => (
              <div
                key={m.sub}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-[12px] p-[12px]"
              >
                <div className="font-data text-[9.5px] text-[var(--muted)] uppercase tracking-[0.5px]">
                  {m.label}
                </div>
                <div
                  className="font-heading text-[22px] mt-[3px]"
                  style={{ color: m.color }}
                >
                  {m.value}
                </div>
                <div className="font-data text-[9.5px] text-[var(--muted)] mt-[1px]">
                  {m.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: full CTL / ATL / TSB cards */}
          <div className="hidden md:block">
            <PerformanceCards
              ctl={{
                label: "Fitness · CTL",
                value: Math.round(load.ctl_now),
                sub: "chronic training load — how fit you are",
                trendDirection: ctlTrend.direction,
                trendValue: ctlTrend.label,
                metricKey: "ctl",
                badge: "42-day load",
                badgeColor: "blue",
              }}
              atl={{
                label: "Fatigue · ATL",
                value: Math.round(load.atl_now),
                sub: "acute training load — how tired you are",
                trendDirection: atlTrend.direction,
                trendValue: atlTrend.label,
                metricKey: "atl",
                badge: "7-day load",
                badgeColor: "hot",
              }}
              tsb={{
                label: "Form · TSB",
                value: Math.round(load.tsb_now),
                sub: "readiness balance",
                trendDirection: tsbIsNeg ? "down" : "up",
                trendValue: "",
                valueIsNegative: tsbIsNeg,
                metricKey: "tsb",
                badge: "CTL − ATL",
                badgeColor: "muted",
              }}
            />
          </div>

          {/* Zone banner */}
          <ZoneBanner zone={load.acwr_zone} acwr={load.acwr_now} />

          {/* Readiness card — desktop only, full width, above the 2-col grid */}
          {readiness && (
            <div className="hidden md:block mt-6">
              <ReadinessCard data={readiness} acwr={load.acwr_now} />
            </div>
          )}

          {/* Desktop 2-col grid (hidden on mobile) */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Training Partners */}
            <TrainingPartnersPanel partners={partners} />

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
                                  : "insufficient data"}
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
              weightUnit={weightUnit}
              className="col-span-1 md:col-span-2"
            />
          </div>

          {/* Mobile sections */}
          <div className="md:hidden space-y-[14px]">
            {readiness && (
              <ReadinessCard data={readiness} acwr={load.acwr_now} />
            )}
            <MobileStrengthTrendCard
              personalRecords={personalRecords}
              token={token}
              weightUnit={weightUnit}
            />
            <VolumeTrendSection initialWeeks={volume.weeks} token={token} />
            <TrainingBalanceSection data={balance} />
            <PRSummaryStrip records={personalRecords} weightUnit={weightUnit} />
          </div>
        </div>
      )}
    </div>
  );
}
