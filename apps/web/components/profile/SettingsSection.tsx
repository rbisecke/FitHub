import { Separator } from "@/components/ui/separator";

interface Props {
  label: string;
  children: React.ReactNode;
}

export function SettingsSection({ label, children }: Props) {
  return (
    <section className="space-y-1 overflow-hidden">
      <h2 className="font-mono text-xs uppercase tracking-widest text-[#8b949e] pb-1">
        {label}
      </h2>
      <Separator className="bg-[#30363d]" />
      <div>{children}</div>
    </section>
  );
}
