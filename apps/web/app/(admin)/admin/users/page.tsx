import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const users = await api.admin.users(session.access_token);

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        animation: "fadeUp .35s ease both",
      }}
    >
      {/* Section header */}
      <section>
        <div
          style={{
            fontSize: 13,
            color: "#4ADE80",
            marginBottom: 6,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          $ fithub users --all
        </div>
        <h1
          className="admin-h1"
          style={{
            fontFamily: "var(--font-archivo-black), sans-serif",
            fontSize: 28,
            margin: "0 0 4px",
            letterSpacing: "-0.6px",
            color: "#e6edf3",
          }}
        >
          Users
        </h1>
        <p
          style={{
            color: "#8b949e",
            fontSize: 13,
            margin: "0 0 20px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          All registered users and their 30-day activity.
        </p>
      </section>

      <UsersTable users={users} />
    </div>
  );
}
