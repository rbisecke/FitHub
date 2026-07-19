import { MixedThemePlaceholder } from "@/components/shell/placeholder-screen";

export default function CoachPage() {
  return (
    <MixedThemePlaceholder
      title="Coach"
      screens={[
        {
          theme: "dark",
          screen: "Conversational chat surface",
          note: "Coaching/intimacy moment (Domain 03). Built in Effort 7.",
        },
        {
          theme: "light",
          screen: "WOD safety checker · modify-workout · NL-log parse",
          note: "Seated review (Domain 03). Built in Effort 7.",
        },
      ]}
    />
  );
}
