import { PlaceholderScreen } from "@/components/shell/placeholder-screen";

/**
 * Invite allowlist management (`08` §9) — placeholder route stub. The real
 * add/remove CRUD over `invited_emails` lands in a later Effort 10 step;
 * this route only needs to resolve and nav correctly under the new admin
 * shell.
 */
export default function AdminAllowlistPage() {
  return (
    <PlaceholderScreen
      title="Allowlist"
      subtitle="Add/remove invited_emails, consumed vs. open state (08 §9). Built in a later Effort 10 step."
      theme="dark"
    />
  );
}
