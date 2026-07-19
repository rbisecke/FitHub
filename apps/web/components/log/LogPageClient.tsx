"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { WorkoutSummary, SessionType, WorkoutFormat } from "@/lib/api";
import { toasts } from "@/lib/toast";
import { fireInitialCommitToast } from "@/lib/pr-celebrations";
import { timeTextToSeconds } from "@/lib/time";
import { useRestTimer } from "@/lib/hooks/useRestTimer";
import { logFormSchema, type LogFormValues } from "./schema";
import { MovementRow } from "./MovementRow";
import { MovementGrid } from "./MovementGrid";
import { MovementSearchDialog } from "./MovementSearchDialog";
import { AddDetailsCollapsible } from "./AddDetailsCollapsible";
import { RestTimer } from "./RestTimer";
import { TemplatePicker } from "./TemplatePicker";
import { PageHeader } from "@/components/ui/page-header";
import type { RecentMovement } from "@/lib/tag";

function getLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function toISOLocal(dateStr: string): string {
  if (dateStr.includes("T")) return dateStr;
  // Append local midnight without UTC conversion so date is preserved in UTC+ zones
  return `${dateStr}T00:00:00`;
}

interface LogPageClientProps {
  accessToken: string;
  recentWorkouts: WorkoutSummary[];
  prefillValues?: Partial<LogFormValues>;
  isFirstWorkout?: boolean;
}

export function LogPageClient({
  accessToken,
  recentWorkouts,
  prefillValues,
  isFirstWorkout = false,
}: LogPageClientProps) {
  const router = useRouter();
  const timer = useRestTimer();
  const [today, setToday] = useState(() => getLocalDateStr());
  useEffect(() => {
    const id = setInterval(() => setToday(getLocalDateStr()), 60_000);
    return () => clearInterval(id);
  }, []);

  // NL input state
  const [nlExpanded, setNlExpanded] = useState(false);
  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  // Set of field indices that were pre-populated from NL parse
  const [parsedIndices, setParsedIndices] = useState<Set<number>>(new Set());

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mobileSelectedId, setMobileSelectedId] = useState<string | null>(null);
  const [mobileSelectedMovement, setMobileSelectedMovement] =
    useState<RecentMovement | null>(null);
  const [mobileValue, setMobileValue] = useState("");
  const [mobileSubmitting, setMobileSubmitting] = useState(false);
  const [movementSearchOpen, setMovementSearchOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema) as Resolver<LogFormValues>,
    defaultValues: {
      performed_at: today,
      movement_entries: [],
      ...prefillValues,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "movement_entries",
  });

  const handleTemplateSelect = useCallback(
    async (w: WorkoutSummary) => {
      try {
        const full = await api.workouts.get(accessToken, w.id);
        const prefillEntries = (full.results ?? []).map((r, i) => ({
          movement_id: r.movement_id ?? undefined,
          movement_name: r.movement_name ?? undefined,
          modality: undefined as string | undefined,
          result_type:
            r.result_type as LogFormValues["movement_entries"][number]["result_type"],
          sets: [] as LogFormValues["movement_entries"][number]["sets"],
          order_index: i,
        }));
        replace(prefillEntries);
        setNlText("");
        setNlExpanded(false);
        setParsedIndices(new Set());
      } catch {
        // ignore — template fetch failed, user can continue manually
      }
    },
    [accessToken, replace],
  );

  const handleNlParse = useCallback(async () => {
    if (nlText.trim().length < 5) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const result = await api.coach.parseLog(accessToken, nlText);
      const entry = result.parsed;
      if (entry) {
        if (entry.title) setValue("title", entry.title);
        const prefill = entry.results.map((r, i) => ({
          movement_id: undefined as string | undefined,
          movement_name: r.movement_name,
          modality: undefined as string | undefined,
          result_type: r.result_type,
          sets: [
            {
              set_index: 0,
              set_type: "working" as const,
              load_kg: r.load_kg != null ? String(r.load_kg) : "",
              load_display: r.load_kg != null ? String(r.load_kg) : "",
              reps: r.reps != null ? String(r.reps) : "",
              time_text:
                r.time_s != null
                  ? `${Math.floor(r.time_s / 60)}:${String(
                      r.time_s % 60,
                    ).padStart(2, "0")}`
                  : "",
              distance_m: "",
              variant_annotation: "",
            },
          ],
          order_index: i,
        }));
        replace(prefill);
        // Mark all newly added rows as parsed
        setParsedIndices(new Set(prefill.map((_, i) => i)));
      }
      // Collapse the NL area after successful parse
      setNlExpanded(false);
      setNlText("");
    } catch {
      setNlError("Couldn't parse that — check your connection and try again.");
    } finally {
      setNlLoading(false);
    }
  }, [accessToken, nlText, setValue, replace]);

  function handleNlToggle() {
    setNlExpanded((v) => {
      if (!v) {
        // Focus textarea after expand animation
        setTimeout(() => textareaRef.current?.focus(), 210);
      }
      return !v;
    });
  }

  const handleMobileSubmit = useCallback(async () => {
    if (!mobileSelectedMovement || !mobileValue.trim()) return;
    setMobileSubmitting(true);
    setSubmitError(null);
    try {
      const todayStr = new Date().toLocaleDateString("sv-SE");
      const rt =
        mobileSelectedMovement.result_type as LogFormValues["movement_entries"][number]["result_type"];
      const workout = await api.workouts.create(accessToken, {
        performed_at: toISOLocal(todayStr),
        is_tag: false,
        results: [
          {
            movement_id: mobileSelectedMovement.movement_id,
            result_type: rt,
            scaled: false,
            load_kg: rt === "weight" ? Number(mobileValue) : undefined,
            reps: rt === "reps" ? parseInt(mobileValue, 10) : undefined,
            time_s:
              rt === "time"
                ? timeTextToSeconds(mobileValue) ?? undefined
                : undefined,
            distance_m: rt === "distance" ? Number(mobileValue) : undefined,
            order_index: 0,
            is_pr: false,
            pace_distance_m: 500,
          },
        ],
      });
      const hasPR = workout.results?.some((r) => r.is_pr) ?? false;
      if (isFirstWorkout) {
        fireInitialCommitToast();
        router.push("/history");
      } else if (hasPR) {
        router.push("/dashboard?pr=1");
      } else {
        toasts.workoutLogged(undefined);
        router.push("/history");
      }
    } catch {
      setSubmitError("Failed to commit workout. Please try again.");
    } finally {
      setMobileSubmitting(false);
    }
  }, [
    mobileSelectedMovement,
    mobileValue,
    accessToken,
    isFirstWorkout,
    router,
  ]);

  async function onSubmit(values: LogFormValues) {
    setSubmitError(null);
    try {
      const results = values.movement_entries.flatMap((entry, entryIdx) =>
        entry.sets.map((set, setIdx) => ({
          movement_id: entry.movement_id ?? undefined,
          result_type: entry.result_type,
          scaled: false,
          load_kg: set.load_kg ? Number(set.load_kg) : undefined,
          reps: set.reps ? parseInt(set.reps, 10) : undefined,
          time_s: set.time_text
            ? timeTextToSeconds(set.time_text) ?? undefined
            : undefined,
          distance_m: set.distance_m ? Number(set.distance_m) : undefined,
          rounds: set.rounds ? parseInt(set.rounds, 10) : undefined,
          partial_reps: set.partial_reps
            ? parseInt(set.partial_reps, 10)
            : undefined,
          calories: set.calories ? parseInt(set.calories, 10) : undefined,
          height_cm: set.height_cm ? Number(set.height_cm) : undefined,
          watts: set.watts ? parseInt(set.watts, 10) : undefined,
          pace_s: set.pace_text
            ? timeTextToSeconds(set.pace_text) ?? undefined
            : undefined,
          variant_annotation: set.variant_annotation || undefined,
          notes: entry.notes || undefined,
          implement: entry.implement || undefined,
          tempo: entry.tempo || undefined,
          side: entry.side || undefined,
          order_index: entryIdx * 100 + setIdx,
          is_pr: false,
          pace_distance_m: 500,
        })),
      );

      const workout = await api.workouts.create(accessToken, {
        performed_at: toISOLocal(values.performed_at),
        title: values.title || undefined,
        session_type: (values.session_type as SessionType) || undefined,
        workout_format: (values.workout_format as WorkoutFormat) || undefined,
        notes: values.notes || undefined,
        session_rpe: values.session_rpe,
        duration_s: values.duration_min
          ? Math.round(Number(values.duration_min) * 60)
          : undefined,
        bodyweight_kg: values.bodyweight_kg
          ? Number(values.bodyweight_kg)
          : undefined,
        is_tag: false,
        results,
      });

      const hasPR = workout.results?.some((r) => r.is_pr) ?? false;

      if (isFirstWorkout) {
        fireInitialCommitToast();
        router.push("/history");
      } else if (hasPR) {
        router.push("/dashboard?pr=1");
      } else {
        toasts.workoutLogged(values.title || undefined);
        router.push("/history");
      }
    } catch {
      setSubmitError("Failed to commit workout. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-nav-safe md:max-w-5xl px-[18px] pt-[14px] pb-2 md:px-8 md:py-6">
      <BackButton
        href="/dashboard"
        label="Home"
        className="md:hidden mb-[14px]"
      />
      <PageHeader
        gitCommand='$ git commit -m "<result>"'
        title="Log a result"
        sub="Record your latest attempt. Beat your record and we'll tag a release. 🏷️"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,520px)_1fr] md:items-start md:gap-10">
        {/* LEFT: primary form */}
        <div className="space-y-6">
          {/* Movement chip card header — contains toggle + grid */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            {/* Header row: label + NL toggle */}
            <div className="flex items-center justify-between">
              <span className="font-data text-[11px] text-[var(--muted-foreground)] uppercase tracking-[0.5px]">
                Movements
              </span>
              <button
                type="button"
                onClick={handleNlToggle}
                aria-expanded={nlExpanded}
                aria-controls="nl-input-region"
                className={`font-data text-[11.5px] transition-colors ${
                  nlExpanded
                    ? "text-[var(--blue)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--blue)]"
                }`}
              >
                or describe your workout
              </button>
            </div>

            {/* NL input area — CSS grid row expand (no magic-number maxHeight) */}
            <div
              id="nl-input-region"
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                nlExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 pt-1">
                  <textarea
                    ref={textareaRef}
                    value={nlText}
                    onChange={(e) => {
                      setNlText(e.target.value);
                      if (nlError) setNlError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setNlExpanded(false);
                    }}
                    placeholder="3×5 back squat 100kg, 3 rounds Fran, 2k row in 7:42…"
                    rows={3}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-[14px] font-data text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:border-[var(--blue)] transition-colors"
                  />
                  {nlError && (
                    <p className="font-data text-[11.5px] text-[var(--red)]">
                      {nlError}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setNlExpanded(false)}
                      className="font-data text-[10px] text-[var(--muted-foreground)]/60 hover:text-[var(--muted-foreground)] transition-colors"
                    >
                      or browse movements ↓
                    </button>
                    <button
                      type="button"
                      onClick={handleNlParse}
                      disabled={nlText.trim().length < 5 || nlLoading}
                      className="flex items-center gap-2 bg-[var(--blue)] text-[var(--bg)] font-bold text-[13px] px-[18px] py-2.5 rounded-[10px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="parse-with-ai-btn"
                    >
                      {nlLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Parsing…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Parse with AI
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Movement chip grid — dims while NL area is expanded */}
            <div
              aria-hidden={nlExpanded ? "true" : undefined}
              className={`transition-opacity duration-200 ${
                nlExpanded
                  ? "opacity-50 pointer-events-none cursor-not-allowed"
                  : ""
              }`}
            >
              <MovementGrid
                accessToken={accessToken}
                selectedId={mobileSelectedId}
                onSelect={(m: RecentMovement) => {
                  setMobileSelectedId(m.movement_id);
                  setMobileSelectedMovement(m);
                  setMobileValue("");
                  if (fields.length >= 10) return;
                  append({
                    movement_id: m.movement_id,
                    movement_name: m.movement_name,
                    modality: m.modality,
                    result_type:
                      m.result_type as LogFormValues["movement_entries"][number]["result_type"],
                    sets: [],
                    order_index: fields.length,
                  });
                }}
                onSearchRequest={() => {
                  if (fields.length < 10) setMovementSearchOpen(true);
                }}
              />
            </div>
          </div>

          {/* Mobile: empty state when no movement selected */}
          {!mobileSelectedMovement && (
            <div
              className="md:hidden rounded-[16px] p-[28px_20px] text-center font-data text-[12px] text-[var(--muted-foreground)]"
              style={{
                background: "var(--card)",
                border: "1px dashed var(--border)",
              }}
            >
              ↑ Tap a movement to log your latest attempt.
            </div>
          )}

          {/* Mobile: inline entry panel */}
          {mobileSelectedMovement && (
            <div
              className="md:hidden rounded-[18px] p-[20px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--accent)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-[16px]">
                <div>
                  <div className="font-data text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.5px]">
                    New attempt
                  </div>
                  <div className="font-heading text-[20px] mt-[3px] text-[var(--foreground)]">
                    {mobileSelectedMovement.movement_name}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-data text-[10px] text-[var(--muted-foreground)]">
                    Current record
                  </div>
                  <div
                    className="font-heading text-[17px] mt-[2px]"
                    style={{ color: "var(--gold)" }}
                  >
                    —
                  </div>
                </div>
              </div>

              {/* Value input */}
              <div
                className="flex items-center rounded-[12px] mb-[14px] px-[14px] py-[2px]"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={mobileValue}
                  onChange={(e) => setMobileValue(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-none font-heading text-[26px] py-[12px] text-[var(--foreground)] outline-none"
                />
                <span className="font-data text-[13px] font-semibold text-[var(--muted-foreground)] ml-2">
                  {mobileSelectedMovement.result_type === "time"
                    ? "min:sec"
                    : mobileSelectedMovement.result_type === "reps"
                      ? "reps"
                      : mobileSelectedMovement.result_type === "distance"
                        ? "m"
                        : "kg"}
                </span>
              </div>

              {/* Submit */}
              {submitError && (
                <p
                  role="alert"
                  className="text-xs text-[var(--destructive)] mb-2"
                >
                  {submitError}
                </p>
              )}
              <button
                type="button"
                onClick={handleMobileSubmit}
                disabled={mobileSubmitting || !mobileValue.trim()}
                className="w-full min-h-[48px] font-heading font-bold text-[14px] py-[13px] rounded-[12px] disabled:opacity-60 bg-[var(--accent)] text-[var(--bg)]"
              >
                {mobileSubmitting ? "Committing…" : "Commit result →"}
              </button>
              <p className="font-data text-[11px] text-[var(--muted-foreground)] text-center mt-[10px]">
                For multiple sets, use the desktop view.
              </p>
            </div>
          )}

          {/* Form — desktop only */}
          <form
            onSubmit={handleSubmit(
              onSubmit as Parameters<typeof handleSubmit>[0],
            )}
            className="hidden md:block space-y-4"
          >
            {/* Movement rows */}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <MovementRow
                  key={field.id}
                  index={idx}
                  accessToken={accessToken}
                  control={control}
                  register={register}
                  setValue={setValue}
                  remove={(i) => {
                    remove(i);
                    // Clear parsed flag for removed row; shift indices above it
                    setParsedIndices((prev) => {
                      const next = new Set<number>();
                      prev.forEach((pi) => {
                        if (pi < i) next.add(pi);
                        else if (pi > i) next.add(pi - 1);
                      });
                      return next;
                    });
                  }}
                  onSetConfirmed={timer.enabled ? timer.start : undefined}
                  isParsed={parsedIndices.has(idx)}
                />
              ))}
            </div>

            {/* Add movement */}
            {fields.length < 10 && (
              <button
                type="button"
                onClick={() =>
                  append({
                    movement_id: undefined,
                    movement_name: undefined,
                    modality: undefined,
                    result_type: "weight",
                    sets: [],
                    order_index: fields.length,
                  })
                }
                className="w-full min-h-[44px] rounded-xl border border-dashed border-[var(--border)] py-3 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--foreground)]"
              >
                + Add movement
              </button>
            )}

            {/* Details collapsible */}
            <AddDetailsCollapsible
              register={register}
              setValue={setValue}
              watch={watch}
              restEnabled={timer.enabled}
              onRestEnabledChange={timer.setEnabled}
              restDuration={timer.duration}
              onRestDurationChange={timer.setDuration}
            />

            {/* Error */}
            {submitError && (
              <p role="alert" className="text-xs text-[var(--destructive)]">
                {submitError}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] rounded-xl bg-[var(--accent)] font-bold text-[var(--bg)] hover:bg-[var(--accent)]/90 disabled:opacity-60"
            >
              {isSubmitting ? "Committing…" : "$ git add ."}
            </Button>
          </form>

          {/* Template picker — mobile only */}
          <div className="md:hidden">
            <TemplatePicker
              recentWorkouts={recentWorkouts}
              onSelect={handleTemplateSelect}
            />
          </div>
        </div>

        {/* RIGHT: desktop sidebar */}
        <div className="hidden md:flex md:flex-col md:gap-6 md:border-l md:border-[var(--border)] md:pl-10">
          <div className="max-w-xs">
            <TemplatePicker
              recentWorkouts={recentWorkouts}
              onSelect={handleTemplateSelect}
              vertical
            />
          </div>
        </div>
      </div>

      {/* Movement search dialog */}
      <MovementSearchDialog
        open={movementSearchOpen}
        onOpenChange={setMovementSearchOpen}
        accessToken={accessToken}
        onSelect={(m) => {
          append({
            movement_id: m.id,
            movement_name: m.name,
            modality: m.modality ?? undefined,
            result_type: "weight",
            sets: [],
            order_index: fields.length,
          });
        }}
      />

      {/* Rest timer overlay */}
      <RestTimer remaining={timer.remaining} onSkip={timer.stop} />
    </div>
  );
}
