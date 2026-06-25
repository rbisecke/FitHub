"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";

interface Props {
  token: string;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function Step4FirstWorkout({ token, onNext, onSkip, onBack }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLog() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const parsed = await api.workouts.parseNl(token, text.trim());
      await api.workouts.create(token, {
        title: parsed.title,
        notes: parsed.notes || null,
        performed_at: new Date().toISOString(),
      });
      onNext();
    } catch {
      setError(
        "Couldn't save the workout. You can log it later from the dashboard.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-48px)] flex-col px-6 py-8 md:min-h-0">
      <p className="font-mono text-xs text-[#8b949e]">
        $ git commit -m &quot;first workout&quot;
      </p>

      <h2 className="mt-6 text-xl font-semibold text-[#e6edf3]">
        Log your first workout
      </h2>
      <p className="mt-2 text-sm text-[#8b949e]">
        Describe what you did in plain English — we&apos;ll parse it into a
        commit.
      </p>

      <div className="mt-6">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`"21-15-9 thrusters and pull-ups, Fran, ~8 min"`}
          rows={4}
          className="resize-none border-[#30363d] bg-[#161b22] font-mono text-sm text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:ring-[#58a6ff]"
        />
        {error && <p className="mt-2 text-xs text-[#ff7b72]">{error}</p>}
      </div>

      <div className="flex-1" />

      <div className="space-y-3 pb-8 md:pb-0">
        <Button
          onClick={handleLog}
          disabled={!text.trim() || saving}
          className="min-h-[48px] w-full bg-[#58a6ff] font-medium text-[#0d1117] hover:bg-[#79b8ff] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Log workout"}
        </Button>
        <div className="flex justify-center gap-6">
          <button
            onClick={onBack}
            className="py-2 text-xs text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            Back
          </button>
          <button
            onClick={onSkip}
            className="py-2 text-xs text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
