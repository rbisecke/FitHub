"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function OnboardingToast() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 8s
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-md border border-[#30363d] bg-[#161b22] px-4 py-3 shadow-lg md:bottom-6 md:left-auto md:right-6 md:w-96"
    >
      <p className="text-sm text-[#e6edf3]">
        Complete your setup to get the most out of FitHub.
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/onboarding/1"
          className="text-xs font-medium text-[#58a6ff] transition-colors hover:text-[#79b8ff]"
          onClick={() => router.refresh()}
        >
          Set up
        </Link>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="text-xs text-[#8b949e] transition-colors hover:text-[#e6edf3]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
