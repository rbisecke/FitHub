import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

interface Props {
  params: Promise<{ step: string }>;
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step: stepStr } = await params;
  const stepNum = Number(stepStr);

  if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 5) {
    redirect("/onboarding/1");
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let profile;
  try {
    profile = await api.profile.get(token);
  } catch {
    redirect("/login");
  }

  // Users who've completed onboarding can only land on step 5 (summary)
  if (profile.onboarding_completed && stepNum !== 5) {
    redirect("/dashboard");
  }

  return <OnboardingWizard step={stepNum} token={token} profile={profile} />;
}
