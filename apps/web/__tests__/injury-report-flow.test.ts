import { describe, expect, it } from "vitest";
import {
  PAIN_WORD_ANCHORS,
  isHighPain,
  painColorToken,
  painSeverityBand,
} from "@/components/injuries/painLevel";
import { isChronicRegion } from "@/components/injuries/picker/taxonomy";
import type { InjuryOut } from "@/lib/api";
import {
  pickerSeverity,
  summarizeAlreadyLogged,
} from "@/components/injuries/ReportInjurySheet";

function injury(overrides: Partial<InjuryOut> & { id: string }): InjuryOut {
  return {
    user_id: "user-1",
    body_region: "knee",
    pain_level: 5,
    mechanism: null,
    notes: null,
    active: true,
    status: "active",
    requires_referral: false,
    substitutions: [],
    contraindicated: [],
    reported_at: "2026-07-01T00:00:00Z",
    resolved_at: null,
    cleared_at: null,
    restriction_notes: null,
    staleness_days: 0,
    ...overrides,
  };
}

describe("pain-level severity band", () => {
  it("bands 0-3 green, 4-7 amber, 8-10 red", () => {
    for (let i = 0; i <= 3; i++) expect(painSeverityBand(i)).toBe("green");
    for (let i = 4; i <= 7; i++) expect(painSeverityBand(i)).toBe("amber");
    for (let i = 8; i <= 10; i++) expect(painSeverityBand(i)).toBe("red");
  });

  it("maps each band to the matching CSS token", () => {
    expect(painColorToken(0)).toBe("var(--green)");
    expect(painColorToken(5)).toBe("var(--amber)");
    expect(painColorToken(9)).toBe("var(--red)");
  });

  it("flags 8, 9, 10 as high pain (the referral pre-echo threshold) and nothing below", () => {
    for (let i = 0; i <= 7; i++) expect(isHighPain(i)).toBe(false);
    expect(isHighPain(8)).toBe(true);
    expect(isHighPain(9)).toBe(true);
    expect(isHighPain(10)).toBe(true);
  });

  it("anchors the track with words at 0 (None), 5 (Moderate), and 10 (Worst imaginable)", () => {
    const byLevel = new Map(PAIN_WORD_ANCHORS.map((a) => [a.level, a.word]));
    expect(byLevel.get(0)).toBe("None");
    expect(byLevel.get(5)).toBe("Moderate");
    expect(byLevel.get(10)).toBe("Worst imaginable");
  });
});

describe("chronic-region check (drives the notes-helper wording switch)", () => {
  it("matches exactly the nine documented chronic/overuse regions", () => {
    const chronic = [
      "it_band",
      "hip_flexor",
      "forearm",
      "arch",
      "achilles",
      "patellar_tendon",
      "rotator_cuff",
      "lateral_elbow",
      "medial_elbow",
    ] as const;
    for (const region of chronic) expect(isChronicRegion(region)).toBe(true);
    for (const region of ["knee", "lower_back", "shoulder", "hip"] as const) {
      expect(isChronicRegion(region)).toBe(false);
    }
  });
});

describe("picker severity glow (amber/red only, no green glow exists)", () => {
  it("only escalates to red once the pain band itself is red (8-10)", () => {
    expect(pickerSeverity(null)).toBe("amber");
    expect(pickerSeverity(0)).toBe("amber");
    expect(pickerSeverity(3)).toBe("amber");
    expect(pickerSeverity(4)).toBe("amber");
    expect(pickerSeverity(7)).toBe("amber");
    expect(pickerSeverity(8)).toBe("red");
    expect(pickerSeverity(10)).toBe("red");
  });
});

describe("summarizeAlreadyLogged", () => {
  it("counts unresolved injuries per region and excludes resolved ones", () => {
    const result = summarizeAlreadyLogged([
      injury({ id: "1", body_region: "knee", status: "active" }),
      injury({
        id: "2",
        body_region: "knee",
        status: "cleared_with_restrictions",
      }),
      injury({ id: "3", body_region: "shoulder", status: "permanent" }),
      injury({ id: "4", body_region: "shoulder", status: "resolved" }),
    ]);
    const byRegion = new Map(result.map((r) => [r.region, r.count]));
    expect(byRegion.get("knee")).toBe(2);
    expect(byRegion.get("shoulder")).toBe(1);
  });

  it("returns an empty list when there are no unresolved injuries", () => {
    expect(
      summarizeAlreadyLogged([injury({ id: "1", status: "resolved" })]),
    ).toEqual([]);
    expect(summarizeAlreadyLogged([])).toEqual([]);
  });
});
