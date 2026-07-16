import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import type { AdminInfraDashboard } from "@/lib/api";
import { InfraPanel } from "@/components/admin/InfraPanel";

export default async function InfraPage() {
  const { token } = await requireAuth();

  // Full page load, not a shared layout render — a generous timeout is fine
  // here since a stalled request should still fail fast rather than hang
  // the page indefinitely.
  let dashboard: AdminInfraDashboard | null = null;
  try {
    dashboard = await api.admin.infra(token, {
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Render with null — surface error state below
  }

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
            color: "var(--green)",
            marginBottom: 6,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          $ fithub infra --status all
        </div>
        <h1
          className="admin-h1"
          style={{
            fontFamily: "var(--font-archivo-black), sans-serif",
            fontSize: 28,
            margin: "0 0 4px",
            letterSpacing: "-0.6px",
            color: "var(--text)",
          }}
        >
          Infrastructure
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 13,
            margin: "0 0 20px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          Supabase, Railway, and Vercel — live status, 1h history, and recent
          deployments.
        </p>
      </section>

      {dashboard == null ? (
        <div
          style={{
            padding: 44,
            textAlign: "center",
            color: "var(--red)",
            fontSize: 13,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
          }}
        >
          Failed to load infrastructure data. Check that the API is running and
          that the collector jobs have been configured.
        </div>
      ) : (
        <InfraPanel dashboard={dashboard} />
      )}
    </div>
  );
}
