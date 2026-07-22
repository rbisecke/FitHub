/**
 * Shared status derivation for Domain 07 §A/§C. The DB CHECK constraint on
 * `data_connections.sync_status` only allows `idle | syncing | error` — a
 * connected-and-healthy row is simply `idle`. The user-facing state is
 * therefore derived from row existence + `last_synced_at`, never from a
 * `connected`/`disconnected` *value* of `sync_status` (those never occur).
 * Both the list (§A) and the source detail screen (§C) use this so the pill
 * logic can't drift between the two surfaces.
 */

export type DerivedState =
  | "connected"
  | "syncing"
  | "error"
  | "awaiting_first_sync";

export function deriveState(conn: {
  sync_status: "idle" | "syncing" | "error";
  last_synced_at: string | null;
}): DerivedState {
  if (conn.sync_status === "error") return "error";
  // Nothing writes `sync_status = 'syncing'` today — the sync endpoint only
  // ever leaves a row at `idle` or `error` — so this branch is unreachable
  // in practice. Kept (not removed) because the DB CHECK constraint already
  // allows the value and a future async ingest pipeline is the obvious place
  // it would start getting written from.
  if (conn.sync_status === "syncing") return "syncing";
  if (conn.last_synced_at == null) return "awaiting_first_sync";
  return "connected";
}

export const STATE_META: Record<
  DerivedState,
  { label: string; color: string; rowTint: boolean }
> = {
  connected: { label: "Connected", color: "var(--green)", rowTint: false },
  syncing: { label: "Syncing…", color: "var(--amber)", rowTint: false },
  error: { label: "Sync error", color: "var(--red)", rowTint: true },
  awaiting_first_sync: {
    label: "Awaiting first sync",
    color: "var(--muted)",
    rowTint: false,
  },
};
