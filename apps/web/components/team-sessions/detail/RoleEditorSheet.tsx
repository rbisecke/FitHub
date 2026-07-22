"use client";

import { useEffect, useState } from "react";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import type { ApiClient } from "@/lib/api/client";
import type { TeamSession, TeamSessionParticipant } from "@/lib/api";

const QUICK_ROLES = ["rx", "scaled", "coach", "athlete"] as const;

/**
 * Change-role sheet (06 §4c) — inline on a participant row (self, or
 * creator for anyone). Dark, since it's triggered directly from a row on
 * this dark detail screen rather than the standalone light §2/§4a flows
 * (§4 Visual treatment).
 */
export function RoleEditorSheet({
  client,
  session,
  participant,
  onClose,
  onSaved,
  onError,
}: {
  client: ApiClient;
  session: TeamSession;
  participant: TeamSessionParticipant;
  onClose: () => void;
  onSaved: (updated: TeamSession) => void;
  onError: (message: string) => void;
}) {
  const [role, setRole] = useState(participant.role ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.teamSessions
      .roleSuggestions({ signal: controller.signal })
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  const chips = [
    ...suggestions.filter(
      (s) => !(QUICK_ROLES as readonly string[]).includes(s),
    ),
    ...QUICK_ROLES,
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await client.teamSessions.patchParticipant(
        session.id,
        participant.id,
        { role: role.trim() || null },
      );
      onSaved(updated);
      onClose();
    } catch {
      onError("Couldn't update the role. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetOverlay title="Change role" onClose={onClose} maxHeight="48dvh">
      <div className="flex flex-col gap-3">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. rx, coach…"
          maxLength={100}
          className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole((prev) => (prev === r ? "" : r))}
              className="rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors"
              style={
                role === r
                  ? { background: "var(--accent)", color: "var(--bg)" }
                  : {
                      background: "var(--surface)",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full rounded-[8px] py-2.5 font-sans text-[14px] font-semibold disabled:opacity-70"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          {saving ? "Saving…" : "Save role"}
        </button>
      </div>
    </SheetOverlay>
  );
}
