"use client";
import { useState, useCallback } from "react";
import { GitCommit } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { NLInputBox } from "./NLInputBox";
import { RecentTemplates } from "./RecentTemplates";
import { MovementBrowser } from "./MovementBrowser";
import { StagedChanges, type Movement } from "./StagedChanges";
import { SessionDetails, type SessionDetailsState } from "./SessionDetails";

function todayISO() {
  return new Date().toISOString().split("T")[0]!;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

// Stub AI parser — replace with POST /api/v1/ai/parse-workout when backend is ready
async function stubParseWorkout(text: string): Promise<Omit<Movement, "id">[]> {
  await new Promise((r) => setTimeout(r, 900));

  const lower = text.toLowerCase();
  const results: Omit<Movement, "id">[] = [];

  // Very naive pattern match — good enough for UI stub
  const patterns: Array<[RegExp, string]> = [
    [/back squat|squat/i, "Back Squat"],
    [/deadlift/i, "Deadlift"],
    [/bench/i, "Bench Press"],
    [/press|ohp/i, "Overhead Press"],
    [/pull.?up/i, "Pull-ups"],
    [/row/i, "Row 2k"],
    [/fran/i, "Fran"],
    [/snatch/i, "Snatch"],
    [/clean/i, "Power Clean"],
    [/run/i, "Run 5k"],
  ];

  for (const [re, name] of patterns) {
    if (re.test(lower)) {
      // Try to parse sets×reps from text, e.g. "3x5", "5×3"
      const setsReps = text.match(/(\d+)\s*[x×]\s*(\d+)/);
      const loadMatch = text.match(/(\d+)\s*kg/);
      results.push({
        name,
        sets: setsReps ? Number(setsReps[1]) : 3,
        reps: setsReps ? Number(setsReps[2]) : 5,
        load: loadMatch ? Number(loadMatch[1]) : 0,
        unit: "kg",
      });
    }
  }

  // If nothing matched, add a generic entry
  if (results.length === 0) {
    results.push({
      name: "Custom movement",
      sets: 3,
      reps: 10,
      load: 0,
      unit: "kg",
    });
  }

  return results;
}

export function TrackPage() {
  const [stagedMovements, setStagedMovements] = useState<Movement[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<SessionDetailsState>({
    date: todayISO(),
    sessionType: "Strength",
    rpe: 0,
    notes: "",
  });
  const [committed, setCommitted] = useState(false);

  // AI parse handler (stubbed)
  async function handleParse(text: string) {
    setIsParsing(true);
    setShowBrowser(false);
    try {
      const parsed = await stubParseWorkout(text);
      setStagedMovements((prev) => [
        ...prev,
        ...parsed.map((m) => ({ ...m, id: makeId() })),
      ]);
    } finally {
      setIsParsing(false);
    }
  }

  // Add movement from browser
  const handleAddMovement = useCallback((m: Omit<Movement, "id">) => {
    setStagedMovements((prev) => {
      // Avoid duplicate names
      if (prev.some((p) => p.name === m.name)) return prev;
      return [...prev, { ...m, id: makeId() }];
    });
    setShowBrowser(false);
  }, []);

  // Add all movements from a session template
  const handleUseTemplate = useCallback((movements: Omit<Movement, "id">[]) => {
    setStagedMovements(movements.map((m) => ({ ...m, id: makeId() })));
  }, []);

  // Edit an individual movement field
  const handleMovementChange = useCallback(
    (
      id: string,
      field: keyof Pick<Movement, "sets" | "reps" | "load">,
      value: number,
    ) => {
      setStagedMovements((prev) =>
        prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
      );
    },
    [],
  );

  // Remove a movement
  const handleRemove = useCallback((id: string) => {
    setStagedMovements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Session details patch
  const handleDetailChange = useCallback(
    (patch: Partial<SessionDetailsState>) => {
      setSessionDetails((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // Commit handler (stub — replace with POST /api/v1/sessions)
  async function handleCommit() {
    if (stagedMovements.length === 0) return;
    setCommitted(true);
    // TODO: POST /api/v1/sessions with { movements: stagedMovements, ...sessionDetails }
    // For now, reset after 2s to show the flow
    await new Promise((r) => setTimeout(r, 2000));
    setStagedMovements([]);
    setCommitted(false);
  }

  const hasMovements = stagedMovements.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader gitCommand="$ git commit -m" title="Track Workout" />

      {/* NL Input */}
      <div className="animate-fadeUp">
        <NLInputBox
          onParse={handleParse}
          onBrowse={() => setShowBrowser((v) => !v)}
          isLoading={isParsing}
        />
      </div>

      {/* Recent templates — show when no movements staged yet */}
      {!hasMovements && (
        <div className="animate-fadeUp">
          <RecentTemplates onUseTemplate={handleUseTemplate} />
        </div>
      )}

      {/* Movement browser */}
      {showBrowser && (
        <div className="animate-fadeUp">
          <MovementBrowser onAdd={handleAddMovement} />
        </div>
      )}

      {/* Staged changes diff */}
      {hasMovements && (
        <StagedChanges
          movements={stagedMovements}
          onChange={handleMovementChange}
          onRemove={handleRemove}
        />
      )}

      {/* Session details (collapsible) */}
      {hasMovements && (
        <div className="animate-fadeUp">
          <SessionDetails
            state={sessionDetails}
            onChange={handleDetailChange}
          />
        </div>
      )}

      {/* Add more / browse — subtle link when movements already staged */}
      {hasMovements && (
        <div className="flex justify-center animate-fadeUp">
          <button
            type="button"
            onClick={() => setShowBrowser((v) => !v)}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            {showBrowser ? "Hide browser" : "+ add another movement"}
          </button>
        </div>
      )}

      {/* Commit button */}
      {hasMovements && (
        <div className="animate-fadeUp pb-20 md:pb-0">
          <button
            type="button"
            onClick={handleCommit}
            disabled={committed}
            className="w-full bg-[var(--accent)] text-[#0A0D12] font-extrabold text-[15px] py-4 rounded-[13px] hover:brightness-110 transition-all font-data flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <GitCommit className="h-4 w-4" />
            {committed ? "Committing…" : '$ git commit -m "session"'}
          </button>
        </div>
      )}

      {/* Empty state prompt */}
      {!hasMovements && !showBrowser && (
        <div className="text-center py-8 animate-fadeUp">
          <p className="text-[13px] text-[var(--muted)]">
            Describe your workout above or browse movements to get started
          </p>
        </div>
      )}
    </div>
  );
}
