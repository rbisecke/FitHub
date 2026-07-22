"use client";

import { useRouter } from "next/navigation";
import { TeamSessionForm } from "./TeamSessionForm";
import type { TeamSession } from "@/lib/api";

/**
 * `/social/team-sessions/[id]/edit` (06 §5) — reuses the create/edit form in
 * edit mode, always open (navigating here IS the "open" action). Closing,
 * saving, or deleting all return to the session's own screens rather than
 * leaving the athlete stranded on a bare form route.
 */
export function EditTeamSessionClient({
  accessToken,
  session,
}: {
  accessToken: string;
  session: TeamSession;
}) {
  const router = useRouter();
  const detailHref = `/social/team-sessions/${session.id}`;

  return (
    <TeamSessionForm
      accessToken={accessToken}
      mode="edit"
      existing={session}
      onClose={() => router.push(detailHref)}
      onSaved={() => router.push(detailHref)}
      onDeleted={() => router.push("/social/team-sessions")}
    />
  );
}
