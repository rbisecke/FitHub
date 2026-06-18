import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware handles unauthenticated redirects, but guard here too for
  // defence-in-depth (e.g. if the middleware matcher misses a path).
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-xl space-y-4 text-center">
        <p className="font-mono text-sm text-zinc-500">$ fithub log --all</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Dashboard
        </h1>
        <p className="text-zinc-400">
          Signed in as <span className="text-zinc-200">{user.email}</span>.
        </p>
        <p className="text-sm text-zinc-600">
          Workout tracking coming in Phase 2.
        </p>
      </div>
    </main>
  );
}
