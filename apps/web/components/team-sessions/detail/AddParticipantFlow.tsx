"use client";

import { useState } from "react";
import { ForcedTheme } from "@/components/shared/forced-theme";
import {
  ParticipantPicker,
  type StagedParticipant,
} from "@/components/team-sessions/ParticipantPicker";
import type { ApiClient } from "@/lib/api/client";
import type { TeamSession } from "@/lib/api";

/**
 * Add-participant flow (06 §4a) for the *existing-session* case — reuses the
 * shared `ParticipantPicker` (find user / add guest / role) built for the
 * create form, wrapping it with the actual `POST .../participants` call
 * this detail screen needs (the create form only stages participants
 * client-side for one bulk submit). Forced light (F1 — seated data entry)
 * even though the page underneath is dark.
 */
export function AddParticipantFlow({
  client,
  token,
  session,
  onClose,
  onAdded,
  onError,
}: {
  client: ApiClient;
  token: string;
  session: TeamSession;
  onClose: () => void;
  onAdded: (updated: TeamSession) => void;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  const participants = session.participants ?? [];
  const existingUserIds = new Set(
    participants.map((p) => p.user_id).filter((id): id is string => !!id),
  );
  const existingGuestNames = new Set(
    participants
      .map((p) => p.guest_name?.trim().toLowerCase())
      .filter((n): n is string => !!n),
  );

  async function handleAdd(staged: StagedParticipant) {
    if (pending) return;
    setPending(true);
    try {
      const updated = await client.teamSessions.addParticipant(session.id, {
        user_id: staged.user_id,
        guest_name: staged.guest_name,
        role: staged.role || null,
      });
      onAdded(updated);
      onClose();
    } catch {
      onError("Couldn't add that participant. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <ForcedTheme theme="light">
      <ParticipantPicker
        accessToken={token}
        existingUserIds={existingUserIds}
        existingGuestNames={existingGuestNames}
        onAdd={(staged) => void handleAdd(staged)}
        onClose={onClose}
      />
    </ForcedTheme>
  );
}
