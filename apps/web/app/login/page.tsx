import { ForcedTheme } from "@/components/shared/forced-theme";
import { SignInScreen } from "@/components/auth/sign-in-screen";

/**
 * Sign-in / request-access route (08 §1). Lives outside the app shell and is
 * always dark (first-impression brand gateway), so it forces the dark theme
 * regardless of the visitor's OS preference.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; view?: string; message?: string }>;
}) {
  const { error, view, message } = await searchParams;
  const sessionExpired =
    error === "session_expired" || message === "session_expired";
  return (
    <ForcedTheme theme="dark">
      <SignInScreen
        // session_expired is announced via a toast, not the generic error banner.
        initialError={sessionExpired ? undefined : error}
        initialView={view === "request" ? "request" : "signin"}
        sessionExpired={sessionExpired}
      />
    </ForcedTheme>
  );
}
