import Link from "next/link";
import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import { InjuryList } from "@/components/injuries/InjuryList";

export default async function InjuriesPage() {
  const { token } = await requireAuth();

  const injuries = await api.injuries.list(token).catch(() => []);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-zinc-100">
            $ git issue --list
          </h1>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">
            # active and cleared injuries
          </p>
        </div>
        <Link
          href="/injuries/new"
          data-testid="report-injury-link"
          className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          + report
        </Link>
      </div>

      <InjuryList initialInjuries={injuries} accessToken={token} />
    </div>
  );
}
