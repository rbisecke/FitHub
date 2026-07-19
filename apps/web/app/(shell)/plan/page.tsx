import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";

/**
 * Plan entry route — "always on some branch." FitHub's plan surface has no
 * standalone list screen in the design spec (02); the athlete is always
 * either mid-generation or looking at one plan's detail. This route resolves
 * which plan that is server-side and redirects: the active plan if one
 * exists, otherwise the generation wizard (02 §4 "Empty (no plan yet)").
 */
export default async function PlanEntryRoute() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let plans: Awaited<ReturnType<typeof api.plans.list>> = [];
  try {
    plans = await api.plans.list(token);
  } catch {
    // Fall through to the wizard — an empty plan list and a failed fetch
    // both land the athlete somewhere useful rather than a dead page.
  }

  const active = plans.find((p) => p.status === "active") ?? plans[0];
  redirect(active ? `/plan/${active.id}` : "/plan/new");
}
