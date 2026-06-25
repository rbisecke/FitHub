"use client";

import Link from "next/link";
import {
  GitCommitHorizontal,
  History,
  Tag,
  TrendingUp,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

type Variant =
  | "dashboard-no-workouts"
  | "records-no-prs"
  | "history-no-workouts"
  | "progress-insufficient-data"
  | "history-filter-empty";

const COPY: Record<
  Variant,
  { header: string; sub?: string; cta: string; href?: string }
> = {
  "dashboard-no-workouts": {
    header: "Your training repo is empty.",
    sub: "Start your commit history.",
    cta: "Log your first workout",
    href: "/log/new",
  },
  "records-no-prs": {
    header: "Your repo has no tags yet.",
    sub: "Log a workout and set your first PR to see it here.",
    cta: "Log workout",
    href: "/log/new",
  },
  "history-no-workouts": {
    header: "Your commit history is empty.",
    sub: "Every workout you log appears here.",
    cta: "Log your first workout",
    href: "/log/new",
  },
  "progress-insufficient-data": {
    header: "Not enough data yet.",
    sub: "Log a few workouts to start seeing your trends.",
    cta: "Log workout",
    href: "/log/new",
  },
  "history-filter-empty": {
    header: "No workouts match this filter.",
    cta: "Clear filter",
  },
};

// One git+fitness glyph per variant — a light touch of warmth, not a mascot.
// Record<Variant, …> makes this exhaustive: a new variant won't typecheck without an icon.
const ICONS: Record<Variant, LucideIcon> = {
  "dashboard-no-workouts": GitCommitHorizontal,
  "records-no-prs": Tag,
  "history-no-workouts": History,
  "progress-insufficient-data": TrendingUp,
  "history-filter-empty": SearchX,
};

interface EmptyStateProps {
  variant: Variant;
  onCta?: () => void;
}

export function EmptyState({ variant, onCta }: EmptyStateProps) {
  const { header, sub, cta, href } = COPY[variant];
  const Icon = ICONS[variant];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[--border] bg-surface-2 text-[--muted]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-base font-mono text-[--muted] mb-1">{header}</p>
      {sub && <p className="text-sm text-[--muted] mb-6">{sub}</p>}
      {!sub && <div className="mb-6" />}
      {onCta || !href ? (
        <Button variant="outline" onClick={onCta} aria-label={cta}>
          {cta}
        </Button>
      ) : (
        <Link href={href} className={buttonVariants({ variant: "outline" })}>
          {cta}
        </Link>
      )}
    </div>
  );
}
