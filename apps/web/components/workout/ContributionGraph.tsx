"use client";

import { ResponsiveCalendar } from "@nivo/calendar";
import { nivoTheme } from "@/lib/nivo-theme";
import type { WorkoutSummary } from "@/lib/api";

interface Props {
  workouts: WorkoutSummary[];
}

export function ContributionGraph({ workouts }: Props) {
  const data = workouts.map((w) => ({
    day: w.performed_at.slice(0, 10),
    value: w.perceived_load_au ?? 1,
  }));

  const now = new Date();
  const toDay = now.toISOString().slice(0, 10);
  const fromDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    .toISOString()
    .slice(0, 10);

  return (
    <div style={{ height: "160px" }} data-testid="contribution-graph">
      <ResponsiveCalendar
        data={data}
        from={fromDay}
        to={toDay}
        emptyColor="#27272a"
        colors={["#164e63", "#0e7490", "#06b6d4", "#22d3ee"]}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        yearSpacing={40}
        monthBorderColor="transparent"
        dayBorderColor="transparent"
        theme={nivoTheme}
        tooltip={({ day, value }) => (
          <div
            style={{
              background: "#18181b",
              padding: "4px 8px",
              border: "1px solid #27272a",
              borderRadius: 4,
              fontSize: 12,
              color: "#f4f4f5",
            }}
          >
            {day}: {value} AU
          </div>
        )}
      />
    </div>
  );
}
