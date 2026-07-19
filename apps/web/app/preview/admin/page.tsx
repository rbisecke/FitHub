import { MixedThemePlaceholder } from "@/components/shell/placeholder-screen";

export default function AdminPage() {
  return (
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
  );
}
