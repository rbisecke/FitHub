import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { AppleHealthScreen } from "@/components/integrations/AppleHealthScreen";

/**
 * Apple Health connect flow + source detail (07 §B/§C), one screen whose
 * internal state carries the client-side lifecycle the design spec
 * describes (`disconnected → connecting → instructions → connected →
 * confirm-revoke → revoking → disconnected`) rather than separate routes —
 * "regenerate" is the same mint action re-entering the same instructions
 * state, so splitting connect vs. detail into different URLs would just
 * mean bouncing between them on every regenerate.
 */
export default async function AppleHealthIntegrationPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialDetail: Awaited<
    ReturnType<typeof api.integrations.appleHealthDetail>
  > | null = null;
  let initialLoadFailed = false;
  try {
    initialDetail = await api.integrations.appleHealthDetail(token);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      initialLoadFailed = true;
    }
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <AppleHealthScreen
        token={token}
        initialDetail={initialDetail}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
