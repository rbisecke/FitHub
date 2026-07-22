import { PlaceholderScreen } from "@/components/shell/placeholder-screen";

/**
 * Infra health monitoring (`08` §8) — placeholder route stub. The real
 * system-health header, sparklines-with-deploy-markers, and deployment-event
 * list land in a later Effort 10 step; this route only needs to resolve and
 * nav correctly under the new admin shell. (Also the strip's "view detail"
 * destination — `InfraStatusBar` already links here.)
 */
export default function AdminInfraPage() {
  return (
    <PlaceholderScreen
      title="Infra health"
      subtitle="System health + Supabase/Railway/Vercel detail, sparklines, deploy events (08 §8). Built in a later Effort 10 step."
      theme="dark"
    />
  );
}
