// Warm-up ramp + per-side plate breakdown (01 §2.7A).
//
// Pure math for the plate/warm-up calculator. Logic only — the UI (a modal sheet
// over active logging) lands in Effort 3 and Domain 02's plan-execution reuses this
// same module. Standard-inventory defaults only; a custom/equipment-filtered
// inventory is explicitly deferred (01 §2.7A).

export type WeightUnit = "kg" | "lb";

/** Standard bar weight per display unit (01 §2.7A). */
export const BAR_WEIGHT: Record<WeightUnit, number> = {
  kg: 20,
  lb: 45,
};

/** Standard Olympic plate inventory per side, largest-first (01 §2.7A). */
export const PLATE_INVENTORY: Record<WeightUnit, readonly number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export interface WarmupStep {
  /** Percentage of the target used for this step (bar-only step reports 0). */
  percent: number;
  /** Rounded, plate-achievable weight for the step. */
  weight: number;
  /** Prescribed rep count for the step. */
  reps: number;
  /** Human label, e.g. "Bar", "50%". */
  label: string;
}

export interface PlateOnSide {
  plate: number;
  count: number;
}

export interface PlateBreakdown {
  targetWeight: number;
  barWeight: number;
  unit: WeightUnit;
  /** Plates on ONE side of the bar, largest-first. */
  perSide: PlateOnSide[];
  /** The actual total this loading produces. */
  achievedWeight: number;
  /** True when `achievedWeight === targetWeight`. */
  exact: boolean;
  /** True when the target is below the bar weight (loads as "bar only"). */
  belowBar: boolean;
}

/** Smallest plate available for a unit (used to detect unachievable remainders). */
function smallestPlate(unit: WeightUnit): number {
  const inv = PLATE_INVENTORY[unit];
  return inv[inv.length - 1] ?? 0;
}

/**
 * Greedily load the closest achievable per-side plate stack for `perSideWeight`
 * using the standard inventory. Returns the plates used and the weight they realize.
 */
function loadPerSide(
  perSideWeight: number,
  unit: WeightUnit,
): { plates: PlateOnSide[]; loaded: number } {
  const plates: PlateOnSide[] = [];
  let remaining = perSideWeight;
  let loaded = 0;
  for (const plate of PLATE_INVENTORY[unit]) {
    if (remaining < plate) continue;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      plates.push({ plate, count });
      const added = plate * count;
      remaining -= added;
      loaded += added;
    }
  }
  return { plates, loaded };
}

/**
 * Compute the per-side plate breakdown for a target weight. Handles the two
 * unachievable cases (01 §2.7A): a target below the bar weight → "bar only"; a
 * per-side remainder smaller than the smallest plate → the closest achievable total.
 */
export function plateBreakdown(
  targetWeight: number,
  unit: WeightUnit,
  barWeight: number = BAR_WEIGHT[unit],
): PlateBreakdown {
  if (targetWeight <= barWeight) {
    return {
      targetWeight,
      barWeight,
      unit,
      perSide: [],
      achievedWeight: barWeight,
      exact: targetWeight === barWeight,
      belowBar: targetWeight < barWeight,
    };
  }

  const perSideTarget = (targetWeight - barWeight) / 2;
  const { plates, loaded } = loadPerSide(perSideTarget, unit);
  const achievedWeight = barWeight + loaded * 2;
  // Exact only when the remainder was fully consumed (never leaves a sub-minimum gap).
  const exact =
    Math.abs(achievedWeight - targetWeight) < smallestPlate(unit) / 2 &&
    achievedWeight === targetWeight;

  return {
    targetWeight,
    barWeight,
    unit,
    perSide: plates,
    achievedWeight,
    exact,
    belowBar: false,
  };
}

/** Round a raw weight to the closest weight achievable with the standard inventory. */
export function closestAchievableWeight(
  rawWeight: number,
  unit: WeightUnit,
  barWeight: number = BAR_WEIGHT[unit],
): number {
  if (rawWeight <= barWeight) return barWeight;
  return plateBreakdown(rawWeight, unit, barWeight).achievedWeight;
}

/**
 * Standard three-step warm-up ramp (01 §2.7A): bar-only × 5, 50% × 3, 80% × 3.
 * Ramp weights are rounded to the closest plate-achievable weight so the printed
 * numbers are actually loadable.
 */
export function warmupRamp(
  targetWeight: number,
  unit: WeightUnit,
  barWeight: number = BAR_WEIGHT[unit],
): WarmupStep[] {
  return [
    { percent: 0, weight: barWeight, reps: 5, label: "Bar" },
    {
      percent: 50,
      weight: closestAchievableWeight(targetWeight * 0.5, unit, barWeight),
      reps: 3,
      label: "50%",
    },
    {
      percent: 80,
      weight: closestAchievableWeight(targetWeight * 0.8, unit, barWeight),
      reps: 3,
      label: "80%",
    },
  ];
}
