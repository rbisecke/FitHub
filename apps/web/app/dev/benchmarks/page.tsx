import { ForcedTheme } from "@/components/shared/forced-theme";
import { BenchmarkHistoryScreen } from "@/components/benchmarks/BenchmarkHistoryScreen";
import type { BenchmarkResponse } from "@/lib/api";

const SINGLE_ATTEMPT: BenchmarkResponse = {
  benchmarks: [
    {
      name: "Fran",
      attempts: [
        { date: "2026-06-01", result_display: "4:32", result_seconds: 272 },
      ],
      pr_display: "4:32",
      improvement_display: "",
    },
  ],
};

const MULTI_NO_IMPROVEMENT: BenchmarkResponse = {
  benchmarks: [
    {
      name: "Cindy",
      attempts: [
        {
          date: "2026-04-01",
          result_display: "18 rounds",
          result_seconds: 1200,
        },
        {
          date: "2026-05-01",
          result_display: "17 rounds",
          result_seconds: 1200,
        },
        {
          date: "2026-06-01",
          result_display: "18 rounds",
          result_seconds: 1200,
        },
      ],
      pr_display: "18 rounds",
      improvement_display: "",
    },
  ],
};

const MULTI_WITH_IMPROVEMENT: BenchmarkResponse = {
  benchmarks: [
    {
      name: "Murph",
      attempts: [
        { date: "2026-01-15", result_display: "48:10", result_seconds: 2890 },
        { date: "2026-03-15", result_display: "44:02", result_seconds: 2642 },
        { date: "2026-05-15", result_display: "41:35", result_seconds: 2495 },
        { date: "2026-07-04", result_display: "39:20", result_seconds: 2360 },
      ],
      pr_display: "39:20",
      improvement_display: "8m50s improvement over 4 attempts",
    },
    {
      name: "Fran",
      attempts: [
        { date: "2026-02-01", result_display: "5:10", result_seconds: 310 },
        { date: "2026-04-01", result_display: "4:48", result_seconds: 288 },
        { date: "2026-06-01", result_display: "4:32", result_seconds: 272 },
      ],
      pr_display: "4:32",
      improvement_display: "38s improvement over 3 attempts",
    },
  ],
};

const EMPTY: BenchmarkResponse = { benchmarks: [] };

/**
 * Dev-only preview (Effort 6, design-spec 04 Screen 3). Renders the
 * production BenchmarkHistoryScreen with mock data covering every documented
 * edge case — single-attempt ("first attempt" label, no trend line),
 * multiple-attempts-with-no-improvement (must render distinctly from
 * single-attempt: trend line present, no "first attempt" label, no
 * improvement chip), multiple-with-improvement, and the no-benchmarks-ever
 * empty state. These specific attempt-count combinations are awkward to seed
 * through the real benchmark-logging flow for a screenshot pass, so this
 * mirrors the established `dev/injuries-list` mock-harness pattern rather
 * than reaching for e2e seeding. Not part of the shipping app.
 */
export default function DevBenchmarksPreview() {
  return (
    <ForcedTheme theme="dark" className="min-h-svh bg-[var(--bg)]">
      <div className="flex flex-col gap-10 py-6">
        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Single attempt — &quot;first attempt&quot; label, no trend line
          </p>
          <BenchmarkHistoryScreen
            token="dev-preview-token"
            initialData={SINGLE_ATTEMPT}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Multiple attempts, no improvement — trend shown, no chip, no
            &quot;first attempt&quot; label
          </p>
          <BenchmarkHistoryScreen
            token="dev-preview-token"
            initialData={MULTI_NO_IMPROVEMENT}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Multiple benchmarks, real improvement
          </p>
          <BenchmarkHistoryScreen
            token="dev-preview-token"
            initialData={MULTI_WITH_IMPROVEMENT}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
            No benchmarks ever logged
          </p>
          <BenchmarkHistoryScreen
            token="dev-preview-token"
            initialData={EMPTY}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Error state
          </p>
          <BenchmarkHistoryScreen
            token="dev-preview-token"
            initialData={null}
            initialLoadFailed={true}
          />
        </section>
      </div>
    </ForcedTheme>
  );
}
