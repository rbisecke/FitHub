"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import type { Movement } from "./StagedChanges";

const CATEGORIES = [
  "All",
  "Strength",
  "Metcon",
  "Gymnastics",
  "Cardio",
  "Olympic",
];

// Static stub movement data — replace with API call when backend is ready
const STUB_MOVEMENTS: Array<{
  name: string;
  category: string;
  lastResult?: string;
}> = [
  { name: "Back Squat", category: "Strength", lastResult: "5×5 @ 100 kg" },
  { name: "Deadlift", category: "Strength", lastResult: "3×3 @ 140 kg" },
  { name: "Bench Press", category: "Strength", lastResult: "4×8 @ 70 kg" },
  { name: "Overhead Press", category: "Strength", lastResult: "4×5 @ 55 kg" },
  { name: "Power Clean", category: "Olympic", lastResult: "5×3 @ 75 kg" },
  { name: "Snatch", category: "Olympic", lastResult: "3×2 @ 60 kg" },
  { name: "Pull-ups", category: "Gymnastics", lastResult: "3×10 BW" },
  { name: "Muscle-ups", category: "Gymnastics", lastResult: "3×5 BW" },
  { name: "Handstand Push-ups", category: "Gymnastics", lastResult: "3×8 BW" },
  { name: "Row 2k", category: "Cardio", lastResult: "7:24" },
  { name: "Run 5k", category: "Cardio", lastResult: "22:30" },
  { name: "Assault Bike Cals", category: "Cardio", lastResult: "50 cals" },
  { name: "Fran", category: "Metcon", lastResult: "4:15" },
  { name: "Helen", category: "Metcon", lastResult: "9:45" },
  { name: "Diane", category: "Metcon", lastResult: "5:30" },
  { name: "Thruster", category: "Metcon", lastResult: "3×10 @ 42.5 kg" },
];

interface Props {
  onAdd: (movement: Omit<Movement, "id">) => void;
}

export function MovementBrowser({ onAdd }: Props) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = STUB_MOVEMENTS.filter((m) => {
    const matchCat = category === "All" || m.category === category;
    const matchQ = m.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  function handleAdd(name: string) {
    onAdd({ name, sets: 3, reps: 5, load: 0, unit: "kg" });
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-[14px] text-[var(--foreground)]">
        Browse movements
      </h2>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movements..."
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2.5 font-data text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={[
              "flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all",
              category === cat
                ? "bg-[var(--accent)] text-[#0A0D12] font-bold"
                : "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Movement grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
        {filtered.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => handleAdd(m.name)}
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-[14px] py-3 text-left hover:border-[var(--accent)] hover:bg-[var(--card)] transition-all group"
          >
            <p className="font-semibold text-[13px] text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
              {m.name}
            </p>
            {m.lastResult && (
              <p className="text-[11px] text-[var(--muted)] mt-0.5 font-data">
                {m.lastResult}
              </p>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-[13px] text-[var(--muted)] text-center py-4">
            No movements found
          </p>
        )}
      </div>
    </div>
  );
}
