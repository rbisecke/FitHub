import { MixedThemePlaceholder } from "@/components/shell/placeholder-screen";

export default function PlanPage() {
  return (
    <MixedThemePlaceholder
      title="Plan"
      screens={[
        {
          theme: "light",
          screen: "Plan / calendar overview · adaptation review",
          note: "Seated review (Domain 02). Built in Effort 5.",
        },
        {
          theme: "dark",
          screen: "Plan generation wizard · loading state",
          note: "Glanceable/celebratory (Domain 02). Built in Effort 5.",
        },
      ]}
    />
  );
}
