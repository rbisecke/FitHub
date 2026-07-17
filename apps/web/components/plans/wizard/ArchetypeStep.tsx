"use client";

import {
  Zap,
  Dumbbell,
  Luggage,
  Wind,
  PersonStanding,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ArchetypeSlug, WizardState } from "@/lib/types/plans";

// Archetypes that carry a specific program-type tag badge.
const ARCHETYPE_TAG: Partial<Record<ArchetypeSlug, string>> = {
  "skill-acquisition": "sets a target",
  "one-rm-peak": "sets a target",
  "travel-minimal": "locks equipment",
  "bodyweight-calisthenics": "locks equipment",
};

const ARCHETYPES: {
  slug: ArchetypeSlug;
  name: string;
  Icon: LucideIcon;
  desc: string;
}[] = [
  {
    slug: "general-crossfit",
    name: "General CrossFit",
    Icon: Zap,
    desc: "Balanced GPP: mixed-modal metcons, gymnastics, and barbell work across all energy systems.",
  },
  {
    slug: "strength-bias",
    name: "Strength Bias",
    Icon: Dumbbell,
    desc: "Squat/hinge/press cycles with conditioning as accessory — adds barbell strength while staying fit.",
  },
  {
    slug: "travel-minimal",
    name: "Travel Minimal",
    Icon: Luggage,
    desc: "Bodyweight and minimal-equipment sessions when you're away from the gym.",
  },
  {
    slug: "aerobic-base",
    name: "Aerobic Base",
    Icon: Wind,
    desc: "Aerobic engine focus: longer aerobic pieces, interval work, and monostructural capacity.",
  },
  {
    slug: "bodyweight-calisthenics",
    name: "Bodyweight",
    Icon: PersonStanding,
    desc: "Structured progressions on rings, bars, and floor — no barbell required.",
  },
  {
    slug: "skill-acquisition",
    name: "Skill Acquisition",
    Icon: Target,
    desc: "Step-by-step prerequisite ladder for a complex movement you don't have yet.",
  },
  {
    slug: "one-rm-peak",
    name: "1RM Peak",
    Icon: TrendingUp,
    desc: "Periodised wave loading toward a single target lift PR on a specific date.",
  },
];

interface Props {
  state: WizardState;
  onSelect: (archetype: ArchetypeSlug) => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}

export function ArchetypeStep({ state, onSelect, headingRef }: Props) {
  return (
    <div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-1 font-mono text-sm font-semibold text-[var(--text)] focus:outline-none"
      >
        step 1 — choose archetype
      </h2>
      <p className="mb-4 font-mono text-xs text-[var(--muted)]">
        What does this training block optimise for?
      </p>
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
        role="radiogroup"
        aria-label="Training archetype"
      >
        {ARCHETYPES.map(({ slug, name, Icon, desc }) => {
          const isSelected = state.archetype === slug;
          const tag = ARCHETYPE_TAG[slug];
          return (
            <button
              key={slug}
              data-testid={`archetype-${slug}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(slug)}
              className={[
                "rounded-lg border p-4 text-left min-h-[44px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                "transition-[border-color,background-color] motion-reduce:transition-none",
                isSelected
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[var(--text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)] hover:brightness-110",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={
                    isSelected ? "text-[var(--accent)]" : "text-[var(--muted)]"
                  }
                />
                <span className="font-mono text-sm font-semibold">{name}</span>
              </div>
              <p className="font-mono text-xs text-[var(--muted)] leading-snug">
                {desc}
              </p>
              {tag && (
                <span
                  className="inline-block mt-2 font-data text-[9.5px] font-semibold uppercase tracking-[0.04em] rounded-full px-2 py-0.5"
                  style={{
                    color: "var(--accent)",
                    background:
                      "color-mix(in srgb, var(--accent) 10%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}
                >
                  {tag}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
