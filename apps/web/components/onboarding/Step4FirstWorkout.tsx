"use client";

import { useState } from "react";
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
        is_tag: false,
      });
      onNext();
    } catch {
      setError(
        "Couldn't save the result. You can log it later from the dashboard.",
      );
    } finally {
      setSaving(false);
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="animate-fadeUp flex flex-col">
      <p
        className="font-data mb-2 text-[13px]"
        style={{ color: "var(--accent)" }}
      >
        $ git commit -m &quot;first result&quot;
      </p>
      <h2 className="font-heading mb-2 text-[28px] text-[var(--foreground)]">
        Log your first result?
      </h2>
      <p className="mb-6 text-[14px] text-[var(--muted)]">
        Drop in one lift to seed your graph — totally optional.
      </p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`"21-15-9 thrusters and pull-ups, Fran, ~8 min"`}
        aria-label="Describe your workout"
        rows={4}
        className="font-data mb-1 resize-none border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:ring-[var(--accent)]"
      />
      {error && (
        <p className="mb-3 text-xs" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {hasText ? (
          <button
            onClick={handleLog}
            disabled={saving}
            className="w-full rounded-[13px] py-[15px] text-[15px] font-extrabold transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#0A0D12" }}
          >
            {saving ? "Saving…" : "Commit result"}
          </button>
        ) : (
          <button
            onClick={onSkip}
            className="w-full rounded-[13px] py-[15px] text-[15px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
            }}
          >
            Skip →
          </button>
        )}
        <div className="flex justify-center">
          <button
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center px-4 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
