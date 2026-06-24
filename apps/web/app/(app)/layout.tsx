import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

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

  return (
    <AppShell user={user} defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </AppShell>
  );
}
