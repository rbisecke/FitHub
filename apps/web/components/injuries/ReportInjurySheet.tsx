"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, createApiClient } from "@/lib/api/client";
import type { InjuryOut } from "@/lib/api";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import type { AlreadyLoggedRegion } from "./picker/VariantASilhouettePicker";
import { VariantASilhouettePicker } from "./picker/VariantASilhouettePicker";
import { VariantBGridPicker } from "./picker/VariantBGridPicker";
import type { BodyRegion } from "./picker/taxonomy";
import { isChronicRegion } from "./picker/taxonomy";
import { PainLevelTrack } from "./PainLevelTrack";
import { isHighPain, painSeverityBand } from "./painLevel";
import type { Mechanism } from "./MechanismChips";
import { MechanismChips } from "./MechanismChips";
import type { InjuryReportResultData } from "./InjuryReportResult";
import { InjuryReportResult } from "./InjuryReportResult";

const NOTES_MAX = 2000;

/**
 * Picker severity glow only supports amber/red (there's no green glow — an
 * unselected/no-pain-yet region has no glow at all). So the green band and
 * the not-yet-set state both fall back to the less alarming "amber," and
 * only the actual red band escalates to red.
 */
export function pickerSeverity(painLevel: number | null): "amber" | "red" {
  return painLevel !== null && painSeverityBand(painLevel) === "red"
    ? "red"
    : "amber";
}

/** Regions with any unresolved injury -> count, from the user's injury list. */
export function summarizeAlreadyLogged(
  injuries: InjuryOut[],
): AlreadyLoggedRegion[] {
  const counts = new Map<BodyRegion, number>();
  for (const injury of injuries) {
    if (injury.status === "resolved") continue;
    const region = injury.body_region;
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return [...counts.entries()].map(([region, count]) => ({ region, count }));
}

/**
 * Injury report container (05 §1) — a single scrollable sheet (Sheet on
 * mobile, centered Dialog on desktop via the shared SheetOverlay primitive):
 * region picker -> pain level -> mechanism -> notes -> submit -> result, all
 * on one surface, no wizard steps. Accepts either picker variant so both can
 * be exercised from the same container for comparison.
 */
export function ReportInjurySheet({
  token,
  variant = "A",
  onClose,
}: {
  token: string;
  variant?: "A" | "B";
  onClose: () => void;
}) {
  const client = useMemo(() => createApiClient(token), [token]);

  const [alreadyLogged, setAlreadyLogged] = useState<AlreadyLoggedRegion[]>([]);
  const [alreadyLoggedError, setAlreadyLoggedError] = useState(false);

  const [region, setRegion] = useState<BodyRegion | null>(null);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [mechanism, setMechanism] = useState<Mechanism | null>(null);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<InjuryReportResultData | null>(null);

  // Already-logged regions are informational context only — the picker keeps
  // working immediately even before/if this resolves (05 §1.1 "Loading"/"Error").
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.injuries
      .list({ signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setAlreadyLogged(summarizeAlreadyLogged(data));
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setAlreadyLoggedError(true);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  const notesOverLimit = notes.length > NOTES_MAX;
  const canSubmit = region !== null && painLevel !== null && !notesOverLimit;
  const chronicSelected = region !== null && isChronicRegion(region);

  async function handleSubmit() {
    if (!canSubmit || region === null || painLevel === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await client.injuries.report({
        body_region: region,
        pain_level: painLevel,
        mechanism: mechanism ?? undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      setResult({
        bodyRegion: region,
        painLevel,
        requiresReferral: created.requires_referral,
        substitutions: created.substitutions,
        contraindicated: created.contraindicated,
      });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 429
          ? "Reporting very fast — try again in a moment."
          : "Couldn't submit the report — check your connection and retry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const notesHelper = chronicSelected
    ? "Describe what happened."
    : "Describe what happened — e.g. 'felt a pop', 'numbness down the arm'.";

  return (
    <SheetOverlay title="Report an injury" onClose={onClose} maxHeight="90dvh">
      {result ? (
        <InjuryReportResult result={result} />
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <p
              className="mb-3 font-sans text-[13px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              Where does it hurt? <span style={{ color: "var(--red)" }}>*</span>
            </p>
            {variant === "A" ? (
              <VariantASilhouettePicker
                selected={region}
                onSelectedChange={setRegion}
                severity={pickerSeverity(painLevel)}
                alreadyLoggedRegions={alreadyLogged}
                alreadyLoggedError={alreadyLoggedError}
              />
            ) : (
              <VariantBGridPicker
                selected={region}
                onSelectedChange={setRegion}
                severity={pickerSeverity(painLevel)}
                alreadyLoggedRegions={alreadyLogged}
              />
            )}
          </section>

          <section>
            <PainLevelTrack value={painLevel} onChange={setPainLevel} />
          </section>

          <section>
            <MechanismChips value={mechanism} onChange={setMechanism} />
          </section>

          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <p
                className="font-sans text-[13px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                Notes{" "}
                <span
                  className="font-sans text-[11px] font-normal"
                  style={{ color: "var(--muted)" }}
                >
                  (optional)
                </span>
              </p>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{
                  color: notesOverLimit ? "var(--red)" : "var(--muted)",
                }}
              >
                {notes.length}/{NOTES_MAX}
              </span>
            </div>
            <p
              className="mb-2 font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              {notesHelper}
              {region === "other" &&
                " Which body part is this? — name it here."}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional details…"
              aria-label="Injury notes (optional)"
              className="w-full resize-none rounded-[8px] px-3 py-2 font-sans text-[13px] outline-none"
              style={{
                background: "var(--surface)",
                border: `1px solid ${
                  notesOverLimit ? "var(--red)" : "var(--border)"
                }`,
                color: "var(--text)",
              }}
            />
            {notesOverLimit && (
              <p
                className="mt-1 font-sans text-[12px]"
                style={{ color: "var(--red)" }}
              >
                Notes are over the {NOTES_MAX}-character limit.
              </p>
            )}
          </section>

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
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="min-h-11 w-full rounded-[8px] font-sans text-[14px] font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {submitting ? "Reporting…" : "Report injury"}
          </button>

          {painLevel !== null && isHighPain(painLevel) && (
            <p
              className="-mt-4 text-center font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              This will still be recorded — the app will flag it for you.
            </p>
          )}
        </div>
      )}
    </SheetOverlay>
  );
}
