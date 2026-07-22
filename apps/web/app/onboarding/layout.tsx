import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";

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
    <ForcedTheme
      theme="dark"
      className="fixed inset-0 z-[90] flex flex-col overflow-y-auto"
    >
      <div
        className="flex flex-1 flex-col"
        style={{
          background:
            "radial-gradient(1000px 500px at 50% -10%, rgba(74,222,128,0.07), transparent 60%), var(--background)",
        }}
      >
        {children}
      </div>
    </ForcedTheme>
  );
}
