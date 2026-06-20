import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InjuryReportForm } from "@/components/injuries/InjuryReportForm";

export default async function NewInjuryPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        $ git issue --label injury
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        # report an injury — we&apos;ll suggest safe alternatives
      </p>
      <InjuryReportForm accessToken={session.access_token} />
    </div>
  );
}
