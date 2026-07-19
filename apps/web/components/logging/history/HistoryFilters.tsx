"use client";

import { useState } from "react";
import type { SessionType } from "@/lib/api";
import { SESSION_LABELS } from "@/lib/display";

export type PartnerFilter = "all" | "solo" | "partner";
export type TagFilter = "all" | "tags-only" | "no-tags";

export interface HistoryFilterState {
  /** Server-side: re-queries from page 1 on change. */
  sessionType: SessionType | null;
  partner: PartnerFilter;
  dateFrom: string;
  dateTo: string;
  /** Client-side: applied to already-loaded pages. */
  tag: TagFilter;
}

export const DEFAULT_FILTERS: HistoryFilterState = {
  sessionType: null,
  partner: "all",
  dateFrom: "",
  dateTo: "",
  tag: "all",
};

export function isFilterActive(f: HistoryFilterState): boolean {
  return (
    f.sessionType !== null ||
    f.partner !== "all" ||
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.tag !== "all"
  );
}

const SESSION_TYPES = Object.keys(SESSION_LABELS) as SessionType[];

/**
 * Filter control for the history feed (01 §5.3). Server-side dimensions
 * (session_type, partner/solo, date range) re-query from page 1; the tag/no-tag
 * split is client-side. All filters are independent and combinable — none resets
 * another. Presentational: state lives in the parent feed.
 */
export function HistoryFilters({
  value,
  onChange,
}: {
  value: HistoryFilterState;
  onChange: (next: HistoryFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = isFilterActive(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle history filters"
          className="rounded-[8px] px-3 py-1.5 font-sans text-[12px]"
          style={{
            background: active ? "var(--accent)" : "var(--surface)",
            color: active ? "var(--bg)" : "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          Filters{active ? " · on" : ""}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div
          className="mt-2 flex flex-col gap-3 rounded-[10px] p-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <Field label="Session type">
            <select
              value={value.sessionType ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  sessionType: (e.target.value || null) as SessionType | null,
                })
              }
              className="w-full rounded-[6px] px-2 py-1.5 font-sans text-[13px]"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              <option value="">All</option>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Participants">
            <Segmented
              options={[
                { value: "all", label: "All" },
                { value: "solo", label: "Solo" },
                { value: "partner", label: "Partner / Team" },
              ]}
              value={value.partner}
              onChange={(v) =>
                onChange({ ...value, partner: v as PartnerFilter })
              }
            />
          </Field>

          <Field label="Type">
            <Segmented
              options={[
                { value: "all", label: "All" },
                { value: "tags-only", label: "Tags only" },
                { value: "no-tags", label: "Workouts only" },
              ]}
              value={value.tag}
              onChange={(v) => onChange({ ...value, tag: v as TagFilter })}
            />
          </Field>

          <div className="flex gap-3">
            <Field label="From">
              <input
                type="date"
                value={value.dateFrom}
                max={value.dateTo || undefined}
                onChange={(e) =>
                  onChange({ ...value, dateFrom: e.target.value })
                }
                className="w-full rounded-[6px] px-2 py-1.5 font-mono text-[12px]"
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                value={value.dateTo}
                min={value.dateFrom || undefined}
                onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
                className="w-full rounded-[6px] px-2 py-1.5 font-mono text-[12px]"
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span
        className="font-sans text-[11px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex overflow-hidden rounded-[6px]"
      style={{ border: "1px solid var(--border)" }}
      role="group"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className="flex-1 px-2 py-1.5 font-sans text-[12px]"
            style={{
              background: selected ? "var(--accent)" : "var(--bg)",
              color: selected ? "var(--bg)" : "var(--muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
