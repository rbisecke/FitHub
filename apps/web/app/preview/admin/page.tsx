import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { MixedThemePlaceholder } from "@/components/shell/placeholder-screen";
import { navHref } from "@/components/shell/nav-items";

export default function AdminPage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Console shell chrome: the "Exit admin" switch OUT of the operator console
          and back to the member shell (00 Part 4 / 08 §4). The switch IN is the
          admin-gated "Admin console" entry in the account menu. An amber accent
          (privileged/caution, not the ordinary --accent blue) marks this as a
          distinct, elevated mode rather than an ordinary page header. */}
      <ForcedTheme theme="dark">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--amber)]/40 bg-background px-4 py-2 text-foreground">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[var(--amber)] px-2 py-0.5 type-caption font-mono uppercase tracking-wide text-[var(--amber)]">
              Admin
            </span>
            <span className="type-caption font-mono text-muted-foreground">
              Operator console
            </span>
          </div>
          <Link
            href={navHref("today")}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-2.5 type-small text-foreground transition-colors duration-fast ease-standard hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Exit admin
          </Link>
        </div>
      </ForcedTheme>
      <MixedThemePlaceholder
        title="Admin"
        screens={[
          {
            theme: "dark",
            screen: "Access requests · users · infra health · allowlist · KB",
            note: "Continuously-watched operational surface (Domain 08). Built in Effort 10.",
          },
          {
            theme: "light",
            screen: "Cost / usage dashboard",
            note: "Seated billing review (Domain 08). Built in Effort 10.",
          },
        ]}
      />
    </div>
  );
}
