import { requireAuth } from "@/lib/supabase/requireAuth";
import { CoachShell } from "@/components/coach/CoachShell";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function CoachSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const { user, token } = await requireAuth();

  return (
    <CoachShell
      token={token}
      userEmail={user.email ?? ""}
      initialSessionId={sessionId}
    />
  );
}
