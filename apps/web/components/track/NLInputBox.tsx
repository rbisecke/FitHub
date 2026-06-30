"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  onParse: (text: string) => void;
  onBrowse: () => void;
  isLoading?: boolean;
}

export function NLInputBox({ onParse, onBrowse, isLoading }: Props) {
  const [value, setValue] = useState("");
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <label className="block font-semibold text-[14px] mb-3 text-[var(--foreground)]">
        What did you do today?
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tell me what you did — 3x5 back squat 100kg, 3 rounds of Fran, 2k row..."
        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-[14px] font-data text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--muted)] min-h-[90px] resize-y focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={onBrowse}
          className="text-[11.5px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          or browse movements ↓
        </button>
        <button
          onClick={() => onParse(value)}
          disabled={!value.trim() || isLoading}
          className="flex items-center gap-2 bg-[var(--blue)] text-[#0A0D12] font-bold text-[13px] px-[18px] py-2.5 rounded-[10px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isLoading ? "Parsing…" : "Parse with AI"}
        </button>
      </div>
    </div>
  );
}
