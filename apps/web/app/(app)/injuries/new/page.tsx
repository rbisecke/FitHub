import { requireAuth } from "@/lib/supabase/requireAuth";
import { InjuryReportForm } from "@/components/injuries/InjuryReportForm";

export default async function NewInjuryPage() {
  const { token } = await requireAuth();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-[var(--text)]">
        $ git issue --label injury
      </h1>
      <p className="mb-8 font-mono text-xs text-[var(--muted)]">
        # report an injury — we&apos;ll suggest safe alternatives
      </p>
      <InjuryReportForm accessToken={token} />
    </div>
  );
}
