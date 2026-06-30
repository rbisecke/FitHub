import type { ReactNode } from "react";

interface ResultEntryFormProps {
  movementName: string;
  meta?: string;
  children: ReactNode;
}

/**
 * Visual container for the result entry phase.
 * Wraps the Archivo Black movement name header around the entry form children.
 */
export function ResultEntryForm({
  movementName,
  meta,
  children,
}: ResultEntryFormProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-[22px]">
      <div>
        <h2 className="font-heading text-[22px] leading-none text-[var(--foreground)]">
          {movementName}
        </h2>
        {meta && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{meta}</p>
        )}
      </div>
      {children}
    </div>
  );
}
