"use client";

import { useState } from "react";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { VariantASilhouettePicker } from "@/components/injuries/picker/VariantASilhouettePicker";
import { VariantBGridPicker } from "@/components/injuries/picker/VariantBGridPicker";
import type { AlreadyLoggedRegion } from "@/components/injuries/picker/VariantASilhouettePicker";
import type { BodyRegion } from "@/components/injuries/picker/taxonomy";
import { ReportInjurySheet } from "@/components/injuries/ReportInjurySheet";
import { InjuryReportResult } from "@/components/injuries/InjuryReportResult";
import type { InjuryReportResultData } from "@/components/injuries/InjuryReportResult";

/**
 * Dev-only preview (Effort 4, 05 §1.1). Renders both body-region picker
 * variants side by side with realistic mock data, plus the two report-result
 * end states, so they can be screenshotted and compared. Mirrors the spirit
 * of Effort 3's (since-removed) `app/dev/logging/` comparison harness. Not
 * part of the shipping app.
 */
const ALREADY_LOGGED: AlreadyLoggedRegion[] = [
  { region: "knee", count: 1 },
  { region: "shoulder", count: 2 },
];

const REFERRAL_RESULT: InjuryReportResultData = {
  bodyRegion: "lower_back",
  painLevel: 9,
  requiresReferral: true,
  substitutions: [],
  contraindicated: [
    "Deadlift",
    "Back Squat",
    "Good Morning",
    "Box Jump",
    "Sit-up",
  ],
};

const SAFE_RESULT: InjuryReportResultData = {
  bodyRegion: "knee",
  painLevel: 4,
  requiresReferral: false,
  substitutions: ["Air Bike", "Seated Row", "Strict Press"],
  contraindicated: [
    "Pistol Squat",
    "Box Jump",
    "Air Squat",
    "Back Squat",
    "Front Squat",
    "Clean",
    "Lunge",
    "Running",
    "Wall Ball",
    "Thruster",
    "Double-under",
  ],
};

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1">
      <p
        className="mb-2 font-sans text-[12px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {title}
      </p>
      <div
        className="rounded-[12px] p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function InjuriesPickerPreviewClient() {
  const [regionA, setRegionA] = useState<BodyRegion | null>(null);
  const [regionB, setRegionB] = useState<BodyRegion | null>("knee");
  const [sheetVariant, setSheetVariant] = useState<"A" | "B" | null>(null);

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="mx-auto max-w-[1200px] p-4 md:p-8">
        <h1
          className="mb-1 font-sans text-[18px] font-bold"
          style={{ color: "var(--text)" }}
        >
          Body-region picker — Variant A vs Variant B (05 §1.1)
        </h1>
        <p
          className="mb-6 font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          The open decision: two-tier silhouette (A) vs grid of mini-diagram
          cards (B). Both carry mock &ldquo;already logged&rdquo; regions (knee
          ×1, shoulder ×2) for context. Compare at 375px and 1280px.
        </p>

        <div className="mb-10 flex flex-col gap-8 md:flex-row">
          <Panel title="Variant A — two-tier silhouette">
            <VariantASilhouettePicker
              selected={regionA}
              onSelectedChange={setRegionA}
              alreadyLoggedRegions={ALREADY_LOGGED}
            />
          </Panel>
          <Panel title="Variant B — mini-diagram grid">
            <VariantBGridPicker
              selected={regionB}
              onSelectedChange={setRegionB}
              alreadyLoggedRegions={ALREADY_LOGGED}
            />
          </Panel>
        </div>

        <div className="mb-10 flex gap-3">
          <button
            type="button"
            onClick={() => setSheetVariant("A")}
            className="min-h-11 rounded-[8px] px-4 font-sans text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Open report sheet — Variant A
          </button>
          <button
            type="button"
            onClick={() => setSheetVariant("B")}
            className="min-h-11 rounded-[8px] px-4 font-sans text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Open report sheet — Variant B
          </button>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <Panel title="Report result — referral verdict (pain 9/10)">
            <InjuryReportResult result={REFERRAL_RESULT} />
          </Panel>
          <Panel title="Report result — safe (substitutions + contraindications)">
            <InjuryReportResult result={SAFE_RESULT} />
          </Panel>
        </div>
      </div>

      {sheetVariant && (
        <ReportInjurySheet
          token="dev-preview-token"
          variant={sheetVariant}
          onClose={() => setSheetVariant(null)}
        />
      )}
    </ForcedTheme>
  );
}
