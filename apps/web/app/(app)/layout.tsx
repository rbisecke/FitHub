import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { AppInit } from "@/components/layout/AppInit";
import { UserPrefsProvider } from "@/lib/contexts/UserPrefsContext";
import { api } from "@/lib/api/client";
import type { WeightUnit, GraphColourMode } from "@/lib/api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Read sidebar cookie server-side to avoid flash on first paint
  const cookieStore = await cookies();
  const raw = cookieStore.get("sidebar_state")?.value;
  // Default true (expanded); first-time md: users will self-collapse via InitialCollapseGuard
  const defaultSidebarOpen = raw !== undefined ? raw === "true" : true;

  // Fetch user prefs for context seeding — fall back to defaults on error
  let weightUnit: WeightUnit = "kg";
  let graphColourMode: GraphColourMode = "intensity";
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    if (token) {
      const profile = await api.profile.get(token);
      weightUnit = profile.weight_unit;
      graphColourMode = profile.graph_colour_mode;
    }
  } catch {
    // Non-fatal: page still renders with safe defaults
  }

  return (
    <UserPrefsProvider
      initialWeightUnit={weightUnit}
      initialGraphColourMode={graphColourMode}
    >
      <AppShell user={user} defaultSidebarOpen={defaultSidebarOpen}>
        <AppInit />
        {children}
      </AppShell>
    </UserPrefsProvider>
  );
}
