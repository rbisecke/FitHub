import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoachChat } from "@/components/coach/CoachChat";
import { NLLogInput } from "@/components/coach/NLLogInput";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-full flex-col mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 shrink-0">
        <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
          $ git coach
        </h1>
        <p className="font-mono text-xs text-zinc-500">
          # AI-powered coaching — RAG-backed, sports-science grounded
        </p>
      </div>

      <div className="mb-6 shrink-0">
        <h2 className="mb-3 font-mono text-sm font-semibold text-zinc-300">
          natural-language log
        </h2>
        <NLLogInput accessToken={session.access_token} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 shrink-0 font-mono text-sm font-semibold text-zinc-300">
          ask the coach
        </h2>
        <CoachChat accessToken={session.access_token} />
      </div>
    </div>
  );
}
