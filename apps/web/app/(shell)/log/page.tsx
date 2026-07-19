import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { ActiveLoggingScreen } from "@/components/logging/ActiveLoggingScreen";

/**
 * Active logging surface — "commit a workout" (01 §2). Light regardless of app
 * theme: Bible 1.1's hard gym-legibility exception (00 Part 2). The entry
 * chooser (§1) and the quick-log / tag-milestone modal surfaces layer over this
 * route. Middleware guards signed-out visitors; this Server Component fetches
 * the token + the user's weight-unit preference for first paint.
 */
export default async function LogPage() {
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
    // Fall back to kg — the screen is fully usable without the preference.
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <ActiveLoggingScreen token={token} weightUnit={weightUnit} />
    </ForcedTheme>
  );
}
