"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@/lib/api/client";
import { partitionParticipants } from "@/lib/team-sessions/leaderboard";
import { Header } from "@/components/team-sessions/detail/Header";
import { TeamScoreHeadline } from "@/components/team-sessions/detail/TeamScoreHeadline";
import {
  Podium,
  PodiumEmptyPlaceholder,
} from "@/components/team-sessions/detail/Podium";
import { RankedList } from "@/components/team-sessions/detail/RankedList";
import { NotYetLoggedGroup } from "@/components/team-sessions/detail/NotYetLoggedGroup";
import { NotesBlock } from "@/components/team-sessions/detail/NotesBlock";
import { ConfirmSheet } from "@/components/team-sessions/detail/ConfirmSheet";
import { FinalizeSheet } from "@/components/team-sessions/detail/FinalizeSheet";
import { AddParticipantFlow } from "@/components/team-sessions/detail/AddParticipantFlow";
import { LinkWorkoutSheet } from "@/components/team-sessions/detail/LinkWorkoutSheet";
import { RoleEditorSheet } from "@/components/team-sessions/detail/RoleEditorSheet";
import type { TeamSession, TeamSessionParticipant } from "@/lib/api";

type Overlay =
  | { type: "add-participant" }
  | { type: "link-workout"; participant: TeamSessionParticipant }
  | { type: "role-editor"; participant: TeamSessionParticipant }
  | { type: "remove"; participant: TeamSessionParticipant }
  | { type: "leave"; participant: TeamSessionParticipant }
  | { type: "delete" }
  | { type: "finalize"; mode: "finalize" | "reopen" }
  | null;

/**
 * `/social/team-sessions/[id]` client shell (design-spec 06 §3/§4/§6) — the
 * live leaderboard / final results screen, the centerpiece of this domain.
 * Owns session state, all overlay sheets, and every participant-management
 * mutation; the subcomponents are presentational.
 */
export function TeamSessionDetailClient({
  token,
  currentUserId,
  initialSession,
}: {
  token: string;
  currentUserId: string;
  initialSession: TeamSession;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);
  const [session, setSession] = useState(initialSession);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const participants = useMemo(
    () => session.participants ?? [],
    [session.participants],
  );
  const isCreator = session.created_by === currentUserId;
  const viewerParticipant = participants.find(
    (p) => p.user_id === currentUserId,
  );
  const viewerHasLogged = viewerParticipant
    ? viewerParticipant.workout_id != null
    : true;
  const isFinal = session.status === "completed";
  const loggedCount = participants.filter((p) => p.workout_id != null).length;
  const totalCount = participants.length;

  const partition = useMemo(
    () => partitionParticipants(participants, session.scoring_type),
    [participants, session.scoring_type],
  );

  function reportError(message: string) {
    setActionError(message);
  }

  async function handleRemove(participant: TeamSessionParticipant) {
    await client.teamSessions.removeParticipant(session.id, participant.id);
    setSession((prev) => ({
      ...prev,
      participants: (prev.participants ?? []).filter(
        (p) => p.id !== participant.id,
      ),
    }));
  }

  async function handleLeave(participant: TeamSessionParticipant) {
    await client.teamSessions.removeParticipant(session.id, participant.id);
    router.push("/social/team-sessions");
  }

  async function handleDelete() {
    await client.teamSessions.delete(session.id);
    router.push("/social/team-sessions");
  }

  async function handleFinalizeOrReopen(mode: "finalize" | "reopen") {
    const updated = await client.teamSessions.patch(session.id, {
      status: mode === "finalize" ? "completed" : "active",
    });
    setSession(updated);
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-6">
      {actionError && (
        <div
          className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2"
          style={{
            background: "color-mix(in srgb, var(--red) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)",
          }}
        >
          <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
            {actionError}
          </p>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setActionError(null)}
            className="font-mono text-[14px]"
            style={{ color: "var(--red)" }}
          >
            ×
          </button>
        </div>
      )}

      <Header
        session={session}
        loggedCount={loggedCount}
        totalCount={totalCount}
        isCreator={isCreator}
        onAddParticipant={() => setOverlay({ type: "add-participant" })}
        onFinalizeOrReopen={() =>
          setOverlay({
            type: "finalize",
            mode: isFinal ? "reopen" : "finalize",
          })
        }
        onDeleteSession={() => setOverlay({ type: "delete" })}
      />

      <TeamScoreHeadline session={session} loggedCount={loggedCount} />

      {loggedCount === 0 ? (
        <PodiumEmptyPlaceholder />
      ) : (
        <Podium
          podium={partition.podium}
          rankCounts={partition.rankCounts}
          isFinal={isFinal}
        />
      )}

      <RankedList
        rows={partition.ranked}
        rankCounts={partition.rankCounts}
        isRelay={partition.isRelay}
        isCreator={isCreator}
        currentUserId={currentUserId}
        onLinkWorkout={(p) =>
          setOverlay({ type: "link-workout", participant: p })
        }
        onChangeRole={(p) =>
          setOverlay({ type: "role-editor", participant: p })
        }
        onRemove={(p) => setOverlay({ type: "remove", participant: p })}
        onLeave={(p) => setOverlay({ type: "leave", participant: p })}
      />

      <NotYetLoggedGroup
        rows={partition.notLogged}
        isFinal={isFinal}
        isCreator={isCreator}
        currentUserId={currentUserId}
        viewerHasLogged={viewerHasLogged}
        onLinkOwnWorkout={() =>
          viewerParticipant &&
          setOverlay({ type: "link-workout", participant: viewerParticipant })
        }
        onLinkWorkout={(p) =>
          setOverlay({ type: "link-workout", participant: p })
        }
        onChangeRole={(p) =>
          setOverlay({ type: "role-editor", participant: p })
        }
        onRemove={(p) => setOverlay({ type: "remove", participant: p })}
        onLeave={(p) => setOverlay({ type: "leave", participant: p })}
      />

      <NotesBlock notes={session.notes} />

      {overlay?.type === "add-participant" && (
        <AddParticipantFlow
          client={client}
          token={token}
          session={session}
          onClose={() => setOverlay(null)}
          onAdded={setSession}
          onError={reportError}
        />
      )}

      {overlay?.type === "link-workout" && (
        <LinkWorkoutSheet
          client={client}
          session={session}
          participant={overlay.participant}
          onClose={() => setOverlay(null)}
          onLinked={setSession}
          onError={reportError}
        />
      )}

      {overlay?.type === "role-editor" && (
        <RoleEditorSheet
          client={client}
          session={session}
          participant={overlay.participant}
          onClose={() => setOverlay(null)}
          onSaved={setSession}
          onError={reportError}
        />
      )}

      {overlay?.type === "remove" && (
        <ConfirmSheet
          title={`Remove ${
            overlay.participant.display_name ??
            overlay.participant.guest_name ??
            "this participant"
          } from this session?`}
          body="Their workout log is kept, just unlinked."
          confirmLabel="Remove"
          destructive
          onClose={() => setOverlay(null)}
          onConfirm={async () => {
            await handleRemove(overlay.participant);
            setOverlay(null);
          }}
        />
      )}

      {overlay?.type === "leave" && (
        <ConfirmSheet
          title="Leave this session?"
          body="Their workout log is kept, just unlinked."
          confirmLabel="Leave"
          destructive
          onClose={() => setOverlay(null)}
          onConfirm={() => handleLeave(overlay.participant)}
        />
      )}

      {overlay?.type === "delete" && (
        <ConfirmSheet
          title="Delete this session?"
          body="Participants keep their individual workout logs — only the shared session record is removed. This can't be undone."
          confirmLabel="Delete"
          destructive
          onClose={() => setOverlay(null)}
          onConfirm={handleDelete}
        />
      )}

      {overlay?.type === "finalize" && (
        <FinalizeSheet
          mode={overlay.mode}
          notYetLogged={partition.notLogged}
          loggedCount={loggedCount}
          totalCount={totalCount}
          onClose={() => setOverlay(null)}
          onConfirm={async () => {
            await handleFinalizeOrReopen(overlay.mode);
            setOverlay(null);
          }}
        />
      )}
    </div>
  );
}
