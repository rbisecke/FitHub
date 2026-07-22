import { PlaceholderScreen } from "@/components/shell/placeholder-screen";

/**
 * Knowledge base (`08` §10) — placeholder route stub. The real per-source
 * chunk-count list plus the honestly-framed manual reindex trigger land in a
 * later Effort 10 step; this route only needs to resolve and nav correctly
 * under the new admin shell.
 */
export default function AdminKnowledgeBasePage() {
  return (
    <PlaceholderScreen
      title="Knowledge base"
      subtitle="RAG corpus source list + manual reindex trigger (08 §10). Built in a later Effort 10 step."
      theme="dark"
    />
  );
}
