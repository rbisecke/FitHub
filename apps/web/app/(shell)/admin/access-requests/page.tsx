import { PlaceholderScreen } from "@/components/shell/placeholder-screen";

/**
 * Access requests queue (`08` §5) — placeholder route stub. The real
 * Pending/Approved/Rejected tabs land in a later Effort 10 step; this route
 * only needs to resolve and nav correctly under the new admin shell.
 */
export default function AdminAccessRequestsPage() {
  return (
    <PlaceholderScreen
      title="Access requests"
      subtitle="Pending / Approved / Rejected queue (08 §5). Built in a later Effort 10 step."
      theme="dark"
    />
  );
}
