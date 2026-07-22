"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeGuestName } from "@fithub/shared";
import { api } from "@/lib/api/client";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { inputStyle } from "./formStyles";
import type { UserSearchResult } from "@/lib/api";

export interface StagedParticipant {
  key: string;
  user_id: string | null;
  guest_name: string | null;
  display_name: string;
  role: string;
}

const QUICK_ROLES = ["rx", "scaled", "coach", "athlete"] as const;

/**
 * Add-participant picker (06 §4a). Two tabs — "Find a FitHub user" (searches
 * `GET /profile/search`) and "Add a guest" (free-text name) — plus a shared
 * role field combining hardcoded quick-pick chips with frequency-ranked
 * suggestions from `GET /team-sessions/role-suggestions` (§2 "Roles").
 *
 * Hand-rolled tabs (not the shadcn `Tabs` primitive) and plain `<input>`/
 * `<button>` styled with `var(--token)` — this sheet is always forced light
 * (F1), and shadcn's primitives lean on Tailwind's `dark:` variant, which
 * keys off the ancestor `.dark` class rather than a nested `data-theme`
 * wrapper (see `ForcedTheme`'s doc comment) and would render wrong when the
 * app shell itself is in dark mode.
 */
export function ParticipantPicker({
  accessToken,
  existingUserIds,
  existingGuestNames,
  onAdd,
  onClose,
}: {
  accessToken: string;
  existingUserIds: ReadonlySet<string>;
  existingGuestNames: ReadonlySet<string>;
  onAdd: (participant: StagedParticipant) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"find" | "guest">("find");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [role, setRole] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Frequency-ranked role suggestions, fetched once on mount (§2 "Roles").
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    api.teamSessions
      .roleSuggestions(accessToken, { signal: controller.signal })
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  // Debounced user search (2-100 chars, capped at 10 results server-side).
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchController = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchController.current?.abort();
    };
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    setSearchError(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    searchTimer.current = setTimeout(() => {
      searchController.current?.abort();
      const controller = new AbortController();
      searchController.current = controller;
      api.profiles
        .search(accessToken, q.trim(), { signal: controller.signal })
        .then((res) => {
          if (!controller.signal.aborted) setResults(res);
        })
        .catch((err) => {
          if (
            !controller.signal.aborted &&
            (err as Error).name !== "AbortError"
          ) {
            setSearchError("Search failed. Please try again.");
            setResults([]);
          }
        });
    }, 300);
  }

  const roleChips = [
    ...suggestions.filter((s) => !QUICK_ROLES.includes(s as never)),
    ...QUICK_ROLES,
  ];

  const guestCollision =
    guestName.trim().length > 0 &&
    existingGuestNames.has(normalizeGuestName(guestName));

  function addUser(u: UserSearchResult) {
    onAdd({
      key: u.user_id,
      user_id: u.user_id,
      guest_name: null,
      display_name: u.display_name ?? "Unknown",
      role: role.trim(),
    });
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    onAdd({
      key: `guest:${normalizeGuestName(name)}:${Date.now()}`,
      user_id: null,
      guest_name: name,
      display_name: name,
      role: role.trim(),
    });
  }

  return (
    <SheetOverlay
      title="Add participant"
      onClose={onClose}
      backdropOpacity={0.25}
    >
      <div className="flex flex-col gap-4">
        <div
          className="flex gap-1 rounded-[8px] p-1"
          style={{ background: "var(--surface)" }}
          role="tablist"
        >
          {(
            [
              { id: "find", label: "Find a FitHub user" },
              { id: "guest", label: "Add a guest" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-[6px] px-2 py-1.5 font-sans text-[13px] font-medium transition-colors"
              style={
                tab === t.id
                  ? { background: "var(--bg)", color: "var(--text)" }
                  : { background: "transparent", color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "find" ? (
          <div className="flex flex-col gap-2">
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
              style={inputStyle}
            />
            {query.trim().length > 0 && query.trim().length < 2 && (
              <p
                className="font-sans text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                Type at least 2 characters.
              </p>
            )}
            {searchError && (
              <p
                className="font-sans text-[12px]"
                style={{ color: "var(--red)" }}
              >
                {searchError}
              </p>
            )}
            {results && results.length === 0 && !searchError && (
              <p
                className="font-sans text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                No one found — you can add them as a guest instead.
              </p>
            )}
            {results && results.length > 0 && (
              <ul className="flex flex-col gap-1">
                {results.map((u) => {
                  const already = existingUserIds.has(u.user_id);
                  return (
                    <li key={u.user_id}>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => addUser(u)}
                        className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors disabled:opacity-50"
                        style={{ background: "var(--surface)" }}
                      >
                        <AvatarMonogram
                          name={u.display_name ?? "?"}
                          seed={u.user_id}
                          size="sm"
                        />
                        <span
                          className="min-w-0 flex-1 truncate font-sans text-[13px]"
                          style={{ color: "var(--text)" }}
                        >
                          {u.display_name ?? "Unknown"}
                        </span>
                        {already && (
                          <span
                            className="font-sans text-[11px]"
                            style={{ color: "var(--muted)" }}
                          >
                            Already a participant
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGuest();
                }
              }}
              placeholder="Guest name"
              className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
              style={inputStyle}
            />
            <p
              className="font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              A guest is a display label for someone without a FitHub account —
              they can&apos;t log in or view this session.
            </p>
            {guestCollision && (
              <p
                className="font-sans text-[12px]"
                style={{ color: "var(--amber)" }}
              >
                Same as an existing guest on this session.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="participant-role"
            className="font-sans text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Role (optional)
          </label>
          <input
            id="participant-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. rx, coach…"
            maxLength={100}
            className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
            style={inputStyle}
          />
          <div className="flex flex-wrap gap-1.5">
            {roleChips.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole((prev) => (prev === r ? "" : r))}
                className="rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors"
                style={
                  role === r
                    ? {
                        background: "var(--accent)",
                        color: "var(--bg)",
                      }
                    : {
                        background: "var(--surface)",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {tab === "guest" && (
          <button
            type="button"
            onClick={addGuest}
            disabled={!guestName.trim()}
            className="w-full rounded-[8px] py-2.5 font-sans text-[14px] font-semibold transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Add guest
          </button>
        )}

        <p className="font-sans text-[12px]" style={{ color: "var(--muted)" }}>
          They&apos;ll be notified after you create the session.
        </p>
      </div>
    </SheetOverlay>
  );
}
