"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscreteStopControl } from "@/components/wellness/DiscreteStopControl";
import {
  hooperIndex,
  hooperBand,
  type WellnessDimension,
} from "@/components/wellness/hooperIndex";
import type { TodayCheckInResponse } from "@/components/wellness/types";

const TOKEN: Record<"green" | "amber" | "red", string> = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
};

const DIMENSIONS: {
  key: WellnessDimension;
  label: string;
  anchorLow: string;
  anchorHigh: string;
  reversedHint?: string;
}[] = [
  {
    key: "sleep",
    label: "Sleep",
    anchorLow: "Poor",
    anchorHigh: "Great",
    reversedHint: "higher = better",
  },
  {
    key: "stress",
    label: "Stress",
    anchorLow: "None/Low",
    anchorHigh: "Severe",
  },
  {
    key: "fatigue",
    label: "Fatigue",
    anchorLow: "None/Low",
    anchorHigh: "Severe",
  },
  {
    key: "soreness",
    label: "Soreness",
    anchorLow: "None/Low",
    anchorHigh: "Severe",
  },
];

type Values = Record<WellnessDimension, number>;
type Touched = Record<WellnessDimension, boolean>;

const NEUTRAL_DEFAULT: Values = {
  sleep: 4,
  stress: 4,
  fatigue: 4,
  soreness: 4,
};
const NONE_TOUCHED: Touched = {
  sleep: false,
  stress: false,
  fatigue: false,
  soreness: false,
};

/**
 * Daily wellness check-in card (05 §3 — plan step 4.18). Note the "same as
 * yesterday" one-tap prefill spec'd for this card is NOT implemented: the
 * only existing endpoint is `GET /wellness/checkin/today`, which returns
 * TODAY's own values (or nothing) — there is no distinct prior-day endpoint
 * to prefill from, and faking "yesterday" from today's own submission would
 * be misleading. Flagged for the backend owner rather than silently dropped.
 */
export function WellnessCheckinCard({
  token,
  initialToday,
  initialLoadFailed = false,
}: {
  token: string;
  initialToday: TodayCheckInResponse | null;
  initialLoadFailed?: boolean;
}) {
  const client = useMemo(() => createApiClient(token), [token]);

  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    initialToday !== null ? "loaded" : initialLoadFailed ? "error" : "loading",
  );
  const [today, setToday] = useState<TodayCheckInResponse | null>(initialToday);
  const [mode, setMode] = useState<"read" | "edit">(
    initialToday?.submitted ? "read" : "edit",
  );
  const [values, setValues] = useState<Values>(
    initialToday?.checkin
      ? {
          sleep: initialToday.checkin.sleep,
          stress: initialToday.checkin.stress,
          fatigue: initialToday.checkin.fatigue,
          soreness: initialToday.checkin.soreness,
        }
      : NEUTRAL_DEFAULT,
  );
  const [touched, setTouched] = useState<Touched>(
    initialToday?.checkin
      ? { sleep: true, stress: true, fatigue: true, soreness: true }
      : NONE_TOUCHED,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (initialToday !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.wellness
      .today({ signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setToday(data);
        setStatus("loaded");
        if (data.submitted && data.checkin) {
          setMode("read");
          setValues({
            sleep: data.checkin.sleep,
            stress: data.checkin.stress,
            fatigue: data.checkin.fatigue,
            soreness: data.checkin.soreness,
          });
          setTouched({
            sleep: true,
            stress: true,
            fatigue: true,
            soreness: true,
          });
        }
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setStatus("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, client]);

  const total = hooperIndex(
    values.sleep,
    values.stress,
    values.fatigue,
    values.soreness,
  );
  const band = hooperBand(total);
  const allTouched =
    touched.sleep && touched.stress && touched.fatigue && touched.soreness;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await client.wellness.checkin(values);
      setSubmitting(false);
      setToday({ submitted: true, checkin: result });
      setMode("read");
    } catch {
      setSubmitting(false);
      setSubmitError("Couldn't save your check-in. Please try again.");
    }
  }

  function setDimension(dim: WellnessDimension, value: number) {
    setValues((v) => ({ ...v, [dim]: value }));
    setTouched((t) => ({ ...t, [dim]: true }));
  }

  return (
    <div
      className="w-full rounded-[10px] p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="font-sans text-[15px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Daily check-in
        </h2>
        {status === "loading" ? (
          <Skeleton className="h-4 w-24 rounded-[4px]" />
        ) : status === "loaded" && mode === "read" ? (
          <span
            className="font-sans text-[12px] font-medium"
            style={{ color: TOKEN[band.token] }}
          >
            {band.label}
          </span>
        ) : null}
      </div>

      {status === "error" ? (
        <div className="mt-3 flex flex-col items-start gap-2">
          <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
            Couldn&apos;t load today&apos;s check-in.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setRetryKey((k) => k + 1);
            }}
            className="flex h-11 items-center gap-1.5 rounded-[8px] px-3 font-sans text-[13px] font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : mode === "read" && today?.checkin ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono tabular-nums text-[28px] font-bold leading-none"
              style={{ color: TOKEN[band.token] }}
            >
              {today.checkin.hooper_index}
            </span>
            <span
              className="font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              sleep {today.checkin.sleep} · stress {today.checkin.stress} ·
              fatigue {today.checkin.fatigue} · soreness{" "}
              {today.checkin.soreness}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="flex h-11 shrink-0 items-center rounded-[8px] px-3 font-sans text-[13px] font-medium"
            style={{
              border: "1px solid var(--accent)",
              color: "var(--accent)",
            }}
          >
            Update
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {DIMENSIONS.map((d) => (
            <DiscreteStopControl
              key={d.key}
              dimension={d.key}
              label={d.label}
              anchorLow={d.anchorLow}
              anchorHigh={d.anchorHigh}
              reversedHint={d.reversedHint}
              value={values[d.key]}
              touched={touched[d.key]}
              onChange={(v) => setDimension(d.key, v)}
              disabled={submitting}
            />
          ))}

          <div
            className="flex items-center justify-between rounded-[8px] px-3 py-2"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <p
                className="font-mono tabular-nums text-[22px] font-bold leading-none"
                style={{ color: TOKEN[band.token] }}
              >
                {total}
              </p>
              <p
                className="mt-0.5 font-sans text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                Hooper Index
              </p>
            </div>
            <span
              className="font-sans text-[13px] font-medium"
              style={{ color: TOKEN[band.token] }}
            >
              {band.label}
            </span>
          </div>

          {submitError && (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {submitError}
            </p>
          )}

          <button
            type="button"
            disabled={!allTouched || submitting}
            onClick={() => void handleSubmit()}
            className="flex h-11 items-center justify-center rounded-[8px] px-4 font-sans text-[14px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              opacity: !allTouched || submitting ? 0.6 : 1,
            }}
          >
            {submitting
              ? "Saving…"
              : today?.submitted
                ? "Update check-in"
                : "Log today's check-in"}
          </button>
        </div>
      )}
    </div>
  );
}
