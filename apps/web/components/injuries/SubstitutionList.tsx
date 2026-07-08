"use client";

interface Props {
  substitutions: string[];
  bodyRegion: string;
}

export function SubstitutionList({ substitutions, bodyRegion }: Props) {
  if (substitutions.length === 0) return null;

  return (
    <div
      data-testid="substitution-list"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <p className="mb-3 font-mono text-xs font-semibold text-[var(--muted)]">
        # safe alternatives for {bodyRegion} injury
      </p>
      <ul className="space-y-1">
        {substitutions.map((sub) => (
          <li
            key={sub}
            className="flex items-start gap-2 text-sm text-[var(--text)]"
          >
            <span className="mt-0.5 font-mono text-xs text-[var(--green)]">
              +
            </span>
            {sub}
          </li>
        ))}
      </ul>
    </div>
  );
}
