"use client";
import { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import type { Movement } from "./StagedChanges";

// Stub recent session data — replace with API call when backend is ready
const STUB_SESSIONS = [
  {
    id: "1",
    title: "Back Squat + Accessory",
    date: "Jun 28",
    movements: [
      { name: "Back Squat", sets: 5, reps: 5, load: 100, unit: "kg" as const },
      {
        name: "Romanian Deadlift",
        sets: 3,
        reps: 8,
        load: 70,
        unit: "kg" as const,
      },
    ],
  },
  {
    id: "2",
    title: "Helen",
    date: "Jun 26",
    movements: [
      { name: "Run 400m", sets: 3, reps: 1, load: 0, unit: "kg" as const },
      {
        name: "Kettlebell Swing",
        sets: 3,
        reps: 21,
        load: 24,
        unit: "kg" as const,
      },
      { name: "Pull-ups", sets: 3, reps: 12, load: 0, unit: "kg" as const },
    ],
  },
  {
    id: "3",
    title: "Olympic Lifting",
    date: "Jun 24",
    movements: [
      { name: "Power Clean", sets: 5, reps: 3, load: 75, unit: "kg" as const },
      { name: "Snatch", sets: 4, reps: 2, load: 60, unit: "kg" as const },
    ],
  },
];

interface Props {
  onUseTemplate: (movements: Omit<Movement, "id">[]) => void;
}

export function RecentTemplates({ onUseTemplate }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-2)] transition-colors"
      >
        <span className="font-semibold text-[14px] text-[var(--foreground)]">
          Recent sessions
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 text-[var(--muted)] transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2.5 border-t border-[var(--border)]">
          {STUB_SESSIONS.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-[var(--surface-2)] rounded-xl px-4 py-3"
            >
              <div>
                <p className="font-semibold text-[13px] text-[var(--foreground)]">
                  {s.title}
                </p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5 font-data">
                  {s.date} · {s.movements.length} movements
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(s.movements)}
                className="flex items-center gap-1.5 text-[12px] text-[var(--accent)] font-semibold hover:brightness-110 transition-all flex-shrink-0 ml-4"
              >
                Use template
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
