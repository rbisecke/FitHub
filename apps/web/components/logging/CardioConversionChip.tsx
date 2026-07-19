"use client";

import { useState } from "react";
import {
  CARDIO_CONVERSION_TABLE,
  MACHINE_LABELS,
  matchRunDistance,
  isRunningMovement,
  type CardioMachine,
  type RunDistanceKey,
} from "@fithub/shared";
import { SheetOverlay } from "./SheetOverlay";

const RUN_LABELS: Record<RunDistanceKey, string> = {
  "200m": "200 m",
  "400m": "400 m",
  "800m": "800 m",
  "1mi": "1 mile",
};
const MACHINES: CardioMachine[] = ["row", "ski", "bikeErg", "assaultBike"];

/**
 * Cardio equipment conversion chip (01 §11, §7). Surfaces on a `mono_structural`
 * movement entry whose display name reads as running-equivalent (reusing the
 * shared distance-token matcher), opening a static reference panel of
 * machine-equivalent distances / calories. Static content, not a computed
 * feature — it consumes the shared 4-distance table (incl. 200m) directly.
 */
export function CardioConversionChip({
  movementName,
}: {
  movementName: string;
}) {
  const [open, setOpen] = useState(false);
  if (!isRunningMovement(movementName)) return null;

  const matched = matchRunDistance(movementName);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full px-2.5 py-1 font-sans text-[11px]"
        style={{
          background: "var(--surface)",
          color: "var(--accent)",
          border: "1px solid var(--border)",
        }}
      >
        Substitute cardio
      </button>
      {open && (
        <SheetOverlay
          title="Substitute cardio"
          onClose={() => setOpen(false)}
          maxHeight="82dvh"
        >
          <CardioTable highlight={matched} />
        </SheetOverlay>
      )}
    </>
  );
}

function CardioTable({ highlight }: { highlight: RunDistanceKey | null }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="font-sans text-[12px]" style={{ color: "var(--muted)" }}>
        Machine equivalents for a run distance. Assault/Echo bike is
        calories-only (no community-standard distance); its calorie values are
        approximate stimulus ranges.
      </p>

      <ConversionSection
        title="Distance"
        highlight={highlight}
        render={distanceCell}
      />
      <ConversionSection
        title="Calories"
        highlight={highlight}
        render={calorieCell}
      />
    </div>
  );
}

function ConversionSection({
  title,
  highlight,
  render,
}: {
  title: string;
  highlight: RunDistanceKey | null;
  render: (
    row: (typeof CARDIO_CONVERSION_TABLE)[number],
    machine: CardioMachine,
  ) => string;
}) {
  return (
    <div>
      <h3
        className="mb-2 font-mono text-[12px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[12px]">
          <thead>
            <tr>
              <th
                className="py-1 pr-3 text-left font-normal"
                style={{ color: "var(--muted)" }}
              >
                Run
              </th>
              {MACHINES.map((m) => (
                <th
                  key={m}
                  className="py-1 pl-3 text-right font-normal"
                  style={{ color: "var(--muted)" }}
                >
                  {MACHINE_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CARDIO_CONVERSION_TABLE.map((row) => {
              const active = row.run === highlight;
              return (
                <tr
                  key={row.run}
                  style={active ? { background: "var(--surface)" } : undefined}
                >
                  <td
                    className="py-1 pr-3 text-left"
                    style={{ color: active ? "var(--accent)" : "var(--text)" }}
                  >
                    {RUN_LABELS[row.run]}
                  </td>
                  {MACHINES.map((m) => (
                    <td
                      key={m}
                      className="py-1 pl-3 text-right tabular-nums"
                      style={{
                        color: "var(--text)",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      {render(row, m)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function distanceCell(
  row: (typeof CARDIO_CONVERSION_TABLE)[number],
  machine: CardioMachine,
): string {
  if (machine === "assaultBike") return "cal only";
  const v = row.distance[machine];
  return `${v.toLocaleString()} m`;
}

function calorieCell(
  row: (typeof CARDIO_CONVERSION_TABLE)[number],
  machine: CardioMachine,
): string {
  const v = row.calories[machine];
  if (typeof v === "number") return `${v} cal`;
  return `${v.min}–${v.max} cal`;
}
