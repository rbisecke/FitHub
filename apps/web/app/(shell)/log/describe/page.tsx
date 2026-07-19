import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { DescribeItScreen } from "@/components/logging/ai/DescribeItScreen";

/**
 * AI natural-language logging route — "Describe it" (01 §10.1). Light regardless
 * of app theme (Bible 1.1). Server Component fetches the token and the user's
 * weight-unit preference; the client screen calls POST /coach/parse-log and
 * hosts the parse-confirmation + movement-matching flow.
 */
export default async function DescribeRoute() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const token = session.access_token;

  let weightUnit = "kg";
  try {
    const profile = await api.profile.get(token);
    weightUnit = profile.weight_unit === "lb" ? "lb" : "kg";
  } catch {
    // kg fallback — the screen is fully usable without the preference.
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <DescribeItScreen token={token} weightUnit={weightUnit} />
    </ForcedTheme>
  );
}
