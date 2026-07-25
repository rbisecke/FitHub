import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

interface Props {
  params: Promise<{ step: string }>;
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step: stepStr } = await params;
  const stepNum = Number(stepStr);

  if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 8) {
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
  } catch (err) {
    // A 403 here means `require_invited` (apps/api/app/auth.py) rejected an
    // otherwise-valid session — the user's email left the invite allowlist
    // after they signed in. That is not "logged out": bouncing them to
    // /login would dump a signed-in user back on the sign-in form. Send
    // them to the dedicated "access paused" state instead; only a genuine
    // auth failure goes to /login.
    if (err instanceof ApiError && err.status === 403) {
      redirect("/access-paused");
    }
    redirect("/login");
  }

  // Users who've completed onboarding can only land on step 8 (summary)
  if (profile.onboarding_completed && stepNum !== 8) {
    redirect("/dashboard");
  }

  return <OnboardingWizard step={stepNum} token={token} profile={profile} />;
}
