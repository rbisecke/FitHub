/**
 * Scaffold route — design-token reference swatch (Effort 0 validation only).
 * Not part of the shipping app; safe to delete once the design system is stable.
 */

const BASE_TOKENS = [
  ["--bg", "Page background"],
  ["--surface", "Cards, raised surfaces"],
  ["--text", "Primary text"],
  ["--muted", "Secondary text, labels"],
  ["--border", "Borders, dividers"],
  ["--accent", "Links, CTAs, hero accent"],
  ["--green", "Positive, streak active"],
  ["--amber", "Warnings, caution"],
  ["--red", "Errors, danger"],
  ["--purple", "PRs, achievements"],
] as const;

const RESERVED_TOKENS = [
  ["--flame", "Streak / fire (Domain 07)"],
  ["--teal", "AI-identity mark (Domain 03)"],
  ["--chronic", "Permanent-injury status (Domain 05)"],
  ["--gold", "Podium 1st (Domain 06)"],
  ["--silver", "Podium 2nd (Domain 06)"],
  ["--bronze", "Podium 3rd (Domain 06)"],
  ["--frost", "Streak-freeze protection (Domain 07)"],
] as const;

const TYPE_ROLES = [
  ["type-h1", "H1 — page title"],
  ["type-h2", "H2 — section heading"],
  ["type-h3", "H3 — card heading"],
  ["type-body", "Body — default copy"],
  ["type-small", "Small — dense lists"],
  ["type-caption", "Caption — labels/metadata"],
  ["type-num-hero", "1,240.5"],
  ["type-num-inline", "225 lb × 5"],
] as const;

const RADII = [
  ["4px", "var(--radius-sm)", "Chips, badges"],
  ["6px", "var(--radius-md)", "Buttons, inputs"],
  ["8px", "var(--radius-lg)", "Cards, sheets"],
  ["9999px", "var(--radius-full)", "Avatars, pills"],
] as const;

function Swatch({ token, role }: { token: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-12 w-12 shrink-0 rounded-lg border"
        style={{ background: `var(${token})`, borderColor: "var(--border)" }}
      />
      <div className="min-w-0">
        <div
          className="type-num-inline text-[13px]"
          style={{ color: "var(--text)" }}
        >
          {token}
        </div>
        <div className="type-caption">{role}</div>
      </div>
    </div>
  );
}

export default function TokensPage() {
  return (
    <main
      className="min-h-screen p-6"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <h1 className="type-h1">Design tokens</h1>
          <p className="type-small" style={{ color: "var(--muted)" }}>
            Effort 0 foundation reference — colors, type, radius, elevation,
            motion.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2">Base palette (00 §3.0)</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {BASE_TOKENS.map(([token, role]) => (
              <Swatch key={token} token={token} role={role} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2">Reserved tokens (00 Part 5)</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {RESERVED_TOKENS.map(([token, role]) => (
              <Swatch key={token} token={token} role={role} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2">Type scale (00 §3.1.1)</h2>
          <div
            className="flex flex-col gap-4 rounded-lg border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {TYPE_ROLES.map(([cls, sample]) => (
              <div key={cls} className="flex items-baseline gap-4">
                <span className={cls}>{sample}</span>
                <span className="type-caption">.{cls}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2">Radius scale (00 §3.5)</h2>
          <div className="flex flex-wrap gap-6">
            {RADII.map(([px, value, role]) => (
              <div key={px} className="flex flex-col items-center gap-2">
                <div
                  className="h-16 w-16 border"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--accent)",
                    borderRadius: value,
                  }}
                />
                <span className="type-num-inline text-[13px]">{px}</span>
                <span className="type-caption">{role}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2">Elevation (00 §3.5)</h2>
          <div className="flex flex-wrap gap-6">
            <div
              className="flex h-24 w-40 items-center justify-center rounded-lg border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <span className="type-small">surface + border</span>
            </div>
            <div
              className="elevation-overlay flex h-24 w-40 items-center justify-center rounded-lg border"
              style={{
                background: "var(--surface-3)",
                borderColor: "var(--border)",
              }}
            >
              <span className="type-small">overlay shadow</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2">Motion (00 §3.6)</h2>
          <div className="flex flex-wrap gap-3">
            {["fast (120ms)", "standard (200ms)", "slow (320ms)"].map((d) => (
              <span
                key={d}
                className="type-num-inline rounded-md border px-3 py-1 text-[13px]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                {d} · cubic-bezier(0.2,0,0,1)
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
