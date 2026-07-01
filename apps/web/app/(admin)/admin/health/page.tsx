import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { HealthPanel } from "@/components/admin/HealthPanel";

export default async function HealthPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const health = await api.admin.health(session.access_token);

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
          $ fithub logs --level error --tail
        </div>
        <h1
          style={{
            fontFamily: "var(--font-archivo-black), sans-serif",
            fontSize: 28,
            margin: "0 0 4px",
            letterSpacing: "-0.6px",
            color: "#e6edf3",
          }}
        >
          Health
        </h1>
        <p
          style={{
            color: "#8b949e",
            fontSize: 13,
            margin: "0 0 20px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          API uptime and recent error events.
        </p>
      </section>

      <HealthPanel health={health} />
    </div>
  );
}
