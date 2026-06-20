import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/NavLink";

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

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-52 flex-col border-r border-zinc-800 bg-zinc-900 px-3 py-4 md:flex">
        <div className="mb-6 px-2">
          <p className="font-mono text-xs text-zinc-500">$ git commit --fit</p>
          <p className="text-lg font-bold text-zinc-50">FitHub</p>
        </div>
        <nav className="space-y-0.5">
          <NavLink href="/dashboard" label="$ status" />
          <NavLink href="/log/new" label="$ commit" />
          <NavLink href="/history" label="$ git log" />
          <NavLink href="/analytics" label="$ git diff" />
        </nav>
        <div className="mt-auto px-2 text-xs text-zinc-600">{user.email}</div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-10 flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 md:hidden">
        <p className="font-bold text-zinc-50">FitHub</p>
        <nav className="flex gap-3">
          <Link href="/dashboard" className="font-mono text-xs text-zinc-400">
            status
          </Link>
          <Link href="/log/new" className="font-mono text-xs text-zinc-400">
            commit
          </Link>
          <Link href="/history" className="font-mono text-xs text-zinc-400">
            log
          </Link>
          <Link href="/analytics" className="font-mono text-xs text-zinc-400">
            diff
          </Link>
        </nav>
      </div>

      <main className="flex-1 overflow-auto pt-10 md:pt-0">{children}</main>
    </div>
  );
}
