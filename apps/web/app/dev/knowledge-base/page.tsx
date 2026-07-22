import { ForcedTheme } from "@/components/shared/forced-theme";
import { KnowledgeBaseScreen } from "@/components/admin/KnowledgeBaseScreen";
import type { AdminKBEntry } from "@/lib/api";

/**
 * Dev-only preview (Effort 10, `08` §10). Renders the production
 * `KnowledgeBaseScreen` with synthetic fixtures — the real
 * `/admin/knowledge-base` route is gated behind `ADMIN_USER_IDS_CSV` (a
 * FastAPI process env var), which isn't configurable from an agent sandbox
 * without touching a denied `.env` file, so this preview is the only way to
 * screenshot the populated state locally. The reindex/status dialog itself
 * still calls the real (stub) endpoints via `token="dev-token"` against
 * whatever API this Next.js process is pointed at — this only fakes the
 * source list, not the honesty-critical reindex flow. Mirrors the
 * established `dev/admin-cost` fixture-preview pattern. Not part of the
 * shipping app.
 */
export default function DevKnowledgeBasePreview() {
  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <KnowledgeBaseScreen
        token="dev-token"
        initialEntries={ENTRIES}
        initialLoadFailed={false}
      />
    </ForcedTheme>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const ENTRIES: AdminKBEntry[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    source_type: "sports_science",
    title: "sports_science",
    chunk_count: 842,
    last_indexed_at: null,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    source_type: "nutrition",
    title: "nutrition",
    chunk_count: 316,
    last_indexed_at: null,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    source_type: "movement_library",
    title: "movement_library",
    chunk_count: 1204,
    last_indexed_at: null,
  },
];
