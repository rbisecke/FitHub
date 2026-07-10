"use client";

import { useState, useCallback } from "react";

interface SetLoggerProps {
  setIndex: number;
  totalSets: number;
  lastLoggedKg: number | null;
  prescribedKg: number | null;
  prescribedReps: string | null;
  onLog: (kg: number | null, reps: number, rpe?: number) => void;
}

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function SetLogger({
  setIndex,
  totalSets,
  lastLoggedKg,
  prescribedKg,
  prescribedReps,
  onLog,
}: SetLoggerProps) {
  const defaultKg = lastLoggedKg ?? prescribedKg ?? 0;
  const defaultReps = parseInt(prescribedReps ?? "1", 10) || 1;

  const [kg, setKg] = useState<number>(defaultKg);
  const [reps, setReps] = useState<number>(defaultReps);
  const [rpe, setRpe] = useState<number | null>(null);
  const [showRpe, setShowRpe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = 2.5;

  const handleDecrement = useCallback(() => {
    setKg((prev) => Math.max(0, Math.round((prev - step) * 10) / 10));
  }, []);

  const handleIncrement = useCallback(() => {
    setKg((prev) => Math.round((prev + step) * 10) / 10);
  }, []);

  const handleKgChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) setKg(val);
    },
    [],
  );

  const handleRepsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val > 0) setReps(val);
    },
    [],
  );

  const handleCommit = useCallback(async () => {
    try {
      setError(null);
      const loadKg = prescribedKg === null && kg === 0 ? null : kg;
      onLog(loadKg, reps, rpe ?? undefined);
    } catch {
      setError("Failed to log set. Try again.");
    }
  }, [kg, reps, rpe, prescribedKg, onLog]);

  return (
    <div className="flex flex-col gap-4">
      {/* Set progress pills */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Set progress">
          {Array.from({ length: totalSets }, (_, i) => (
            <div
              key={i}
              className="h-2 w-6 rounded-sm"
              style={{
                background:
                  i < setIndex
                    ? "var(--green)"
                    : i === setIndex
                      ? "var(--accent)"
                      : "var(--border)",
                opacity: i > setIndex ? 0.5 : 1,
              }}
              aria-label={
                i < setIndex
                  ? `Set ${i + 1} complete`
                  : i === setIndex
                    ? `Set ${i + 1} current`
                    : `Set ${i + 1} upcoming`
              }
            />
          ))}
        </div>
        <span className="font-data tabular-nums text-[13px] text-[var(--muted)] ml-auto">
          {setIndex + 1}/{totalSets}
        </span>
      </div>

      {/* Prescribed hint */}
      {prescribedKg !== null && (
        <p className="font-sans text-[12px] text-[var(--muted)]">
          prescribed:{" "}
          <span className="font-data tabular-nums text-[var(--amber)]">
            {prescribedKg} kg
          </span>
          {prescribedReps && (
            <>
              {" "}
              ×{" "}
              <span className="font-data tabular-nums text-[var(--text)]">
                {prescribedReps}
              </span>
            </>
          )}
        </p>
      )}

      {/* Load stepper */}
      <div className="flex flex-col gap-2">
        <label className="font-sans text-[12px] text-[var(--muted)]">
          load (kg)
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] font-data text-[18px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
            aria-label="Decrease load by 2.5 kg"
          >
            −
          </button>
          <input
            type="number"
            value={kg}
            onChange={handleKgChange}
            min={0}
            step={2.5}
            className="flex-1 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-center font-data tabular-nums text-[20px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            aria-label="Load weight in kilograms"
          />
          <button
            onClick={handleIncrement}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] font-data text-[18px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
            aria-label="Increase load by 2.5 kg"
          >
            +
          </button>
        </div>
      </div>

      {/* Reps input */}
      <div className="flex flex-col gap-2">
        <label className="font-sans text-[12px] text-[var(--muted)]">
          reps
        </label>
        <input
          type="number"
          value={reps}
          onChange={handleRepsChange}
          min={1}
          step={1}
          className="min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-center font-data tabular-nums text-[20px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          aria-label="Reps completed"
        />
      </div>

      {/* commit set — primary CTA */}
      <button
        onClick={handleCommit}
        className="min-h-[56px] w-full rounded-2xl bg-[var(--accent)] font-sans text-[16px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 active:scale-[0.98]"
        aria-label={`Commit set ${setIndex + 1} of ${totalSets}`}
      >
        commit set
      </button>

      {error && (
        <p className="font-sans text-[12px] text-[var(--red)]" role="alert">
          {error}
        </p>
      )}

      {/* RPE collapsible */}
      <div>
        <button
          onClick={() => setShowRpe((v) => !v)}
          className="flex items-center gap-1.5 font-sans text-[12px] text-[var(--muted)] hover:text-[var(--text)] min-h-[44px] transition-colors"
          aria-expanded={showRpe}
          aria-controls="rpe-panel"
          aria-label="Toggle RPE input"
        >
          <span
            className="inline-block transition-transform duration-150"
            style={{ transform: showRpe ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▸
          </span>
          RPE / notes
        </button>
        {showRpe && (
          <div id="rpe-panel" className="flex flex-col gap-3 pt-1">
            <label className="font-sans text-[12px] text-[var(--muted)]">
              RPE (rate of perceived exertion)
            </label>
            <div
              className="grid grid-cols-5 gap-2"
              role="group"
              aria-label="Select RPE from 1 to 10"
            >
              {RPE_VALUES.map((val) => (
                <button
                  key={val}
                  onClick={() => setRpe(rpe === val ? null : val)}
                  className="min-h-[44px] rounded-lg border font-data tabular-nums text-[14px] transition-colors"
                  style={{
                    borderColor:
                      rpe === val ? "var(--accent)" : "var(--border)",
                    background:
                      rpe === val
                        ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                        : "var(--surface)",
                    color: rpe === val ? "var(--accent)" : "var(--text)",
                  }}
                  aria-pressed={rpe === val}
                  aria-label={`RPE ${val}`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
