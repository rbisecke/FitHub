import { PlaceholderScreen } from "@/components/shell/placeholder-screen";

/**
 * User management (`08` §6) — placeholder route stub. The real search/sort
 * table plus disable/magic-link/delete actions land in a later Effort 10
 * step; this route only needs to resolve and nav correctly under the new
 * admin shell.
 */
export default function AdminUsersPage() {
  return (
    <PlaceholderScreen
      title="Users"
      subtitle="Member table + disable / magic-link / delete actions (08 §6). Built in a later Effort 10 step."
      theme="dark"
    />
  );
}
