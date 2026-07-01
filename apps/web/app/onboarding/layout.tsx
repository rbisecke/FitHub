import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col overflow-y-auto"
      style={{
        background:
          "radial-gradient(1000px 500px at 50% -10%, rgba(74,222,128,0.07), transparent 60%), var(--background)",
      }}
    >
      {children}
    </div>
  );
}
