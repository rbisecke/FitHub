"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { TrainingPartner } from "@/lib/api";

interface Props {
  initial: TrainingPartner[];
  token: string;
}

export function PartnerList({ initial, token }: Props) {
  const [partners, setPartners] = useState<TrainingPartner[]>(initial);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  function openForm() {
    setAdding(true);
    setEmail("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeForm() {
    setAdding(false);
    setError(null);
    addBtnRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") closeForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const partner = await api.addTrainingPartner(token, email.trim());
      setPartners((prev) => [partner, ...prev]);
      toast.success("Training partner added.", { duration: 2000 });
      closeForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404")) {
        setError(
          "No account found for that email. They may need an invitation.",
        );
      } else {
        toast.error("Could not add partner. Try again.", { duration: 4000 });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-1">
      {partners.length === 0 && !adding && (
        <div className="py-3">
          <p className="text-sm text-[#8b949e]">No training partners yet.</p>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Add a partner to see their activity alongside yours.
          </p>
        </div>
      )}

      {partners.map((p) => (
        <div
          key={p.user_id}
          className="flex items-center justify-between py-2.5"
        >
          <span className="text-sm text-[#e6edf3]">{p.display_name}</span>
          {p.session_count > 0 && (
            <span className="font-mono text-xs text-[#8b949e]">
              {p.session_count} {p.session_count === 1 ? "session" : "sessions"}
            </span>
          )}
        </div>
      ))}

      {adding ? (
        <form
          onSubmit={handleSubmit}
          className="pt-2 space-y-2"
          onKeyDown={handleKeyDown}
        >
          <div className="flex gap-2 flex-wrap">
            <Input
              ref={inputRef}
              type="email"
              autoComplete="email"
              placeholder="partner@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-0 bg-[#161b22] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] font-mono text-sm min-h-[44px]"
              aria-label="Partner email address"
            />
            <Button
              type="submit"
              disabled={submitting || !email.trim()}
              className="min-h-[44px] bg-[#58a6ff] text-[#0d1117] hover:bg-[#58a6ff]/80 font-sans"
            >
              {submitting ? "Adding…" : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              className="min-h-[44px] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] font-sans"
            >
              Cancel
            </Button>
          </div>
          {error && <p className="text-xs text-[#d29922]">{error}</p>}
        </form>
      ) : (
        <Button
          ref={addBtnRef}
          variant="outline"
          size="sm"
          onClick={openForm}
          className="mt-1 border-[#30363d] text-[#58a6ff] hover:bg-[#161b22] hover:text-[#58a6ff] font-mono min-h-[44px]"
        >
          + Add partner
        </Button>
      )}
    </div>
  );
}
