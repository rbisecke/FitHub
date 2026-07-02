import { redirect } from "next/navigation";

export const metadata = {
  title: "Track Workout · FitHub",
};

export default function TrackRoute() {
  redirect("/log/new");
}
