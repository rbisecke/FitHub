import { Separator } from "@/components/ui/separator";

interface Props {
  label: string;
  children: React.ReactNode;
}

export function SettingsSection({ label, children }: Props) {
  return (
    <section className="space-y-1 overflow-hidden animate-fadeUp">
      <h2 className="font-data text-[13px] font-bold uppercase tracking-[0.5px] text-[var(--muted-foreground)] pb-1">
        {label}
      </h2>
      <Separator className="bg-[var(--border)]" />
      <div>{children}</div>
    </section>
  );
}
