import Link from "next/link";

interface BackButtonProps {
  href: string;
  label: string;
  className?: string;
}

export function BackButton({ href, label, className }: BackButtonProps) {
  return (
    <div className={`flex items-center gap-[9px] ${className ?? ""}`}>
      <Link
        href={href}
        className="flex text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        aria-label={`Back to ${label}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>
      <span className="font-data text-[11.5px] text-[var(--muted)]">
        {label}
      </span>
    </div>
  );
}
