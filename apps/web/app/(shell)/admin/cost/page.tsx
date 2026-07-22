import { PlaceholderScreen } from "@/components/shell/placeholder-screen";

/**
 * Cost / usage dashboard (`08` §7) — placeholder route stub. This is the one
 * **light** admin surface (theme map, `08` §4) — the dark infra strip/nav
 * chrome above it is unaffected; only this page body opts into light. The
 * real hero-stat + invoice + trend + per-user layout lands in a later
 * Effort 10 step; this route only needs to resolve and nav correctly under
 * the new admin shell.
 */
export default function AdminCostPage() {
  return (
    <PlaceholderScreen
      title="Cost & usage"
      subtitle="Hero stat, cost breakdown, trend, per-user list (08 §7). Built in a later Effort 10 step."
      theme="light"
    />
  );
}
