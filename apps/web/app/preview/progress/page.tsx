import { MixedThemePlaceholder } from "@/components/shell/placeholder-screen";

export default function ProgressPage() {
  return (
    <MixedThemePlaceholder
      title="Progress"
      screens={[
        {
          theme: "dark",
          screen: "Records home · readiness score · PR reveal · streaks",
          note: "Glanceable/celebratory (Domains 04 · 07). Built in Effort 6.",
        },
        {
          theme: "light",
          screen: "Load-model · volume · training-balance · trend charts",
          note: "Seated multi-series analysis (Domain 04). Built in Effort 6.",
        },
      ]}
    />
  );
}
