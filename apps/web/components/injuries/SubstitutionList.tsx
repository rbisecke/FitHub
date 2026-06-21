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
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <p className="mb-3 font-mono text-xs font-semibold text-zinc-400">
        # safe alternatives for {bodyRegion} injury
      </p>
      <ul className="space-y-1">
        {substitutions.map((sub, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="mt-0.5 font-mono text-xs text-green-500">+</span>
            {sub}
          </li>
        ))}
      </ul>
    </div>
  );
}
