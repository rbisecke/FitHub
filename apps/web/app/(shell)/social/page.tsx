import { MixedThemePlaceholder } from "@/components/shell/placeholder-screen";

export default function SocialPage() {
  return (
    <MixedThemePlaceholder
      title="Social"
      screens={[
        {
          theme: "dark",
          screen: "Live leaderboard · results reveal · session list",
          note: "Glanceable/celebratory (Domain 06). Built in Effort 8.",
        },
        {
          theme: "light",
          screen: "Create/edit session · training-partners roster",
          note: "Seated data entry (Domain 06). Built in Effort 8.",
        },
      ]}
    />
  );
}
