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
    <div className="min-h-[100dvh] bg-[#0d1117] md:flex md:items-center">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
