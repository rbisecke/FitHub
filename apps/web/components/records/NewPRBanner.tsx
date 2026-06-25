"use client";

import { useEffect, useState } from "react";

interface Props {
  count: number;
}

export function NewPRBanner({ count }: Props) {
  const [visible, setVisible] = useState(count > 0);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="mb-4 rounded border border-green-800 bg-green-950/40 px-4 py-2 text-xs font-mono text-green-400">
      {count === 1
        ? "New PR tagged. Your repo just got faster."
        : `${count} new PRs tagged. Milestone release pushed.`}
    </div>
  );
}
