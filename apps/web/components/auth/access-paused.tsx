"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * "Access paused" full-page state (08 §1 "signed-in but not invited", step 2.4).
 *
 * Reached when a user holds a valid Supabase session but their email is no longer
 * on the invite allowlist, so every data route 403s. This is NOT logged-out — the
 * session is real — so it must not dump the user on the sign-in form. Because they
 * are already authenticated, the copy can be less vague than the signup gate: it
 * says access was removed without leaking anything about other emails.
 */
export function AccessPaused() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out. Please try again.");
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-md bg-[color:var(--amber)]/15 text-[color:var(--amber)]">
            <PauseCircle className="size-6" aria-hidden />
          </span>
          <h1 className="type-h3">Access paused</h1>
          <p className="type-small text-muted-foreground">
            Your account exists, but access to FitHub isn&apos;t active right
            now. If you think this is a mistake, you can request access again.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => router.push("/login?view=request")}
          >
            Request access again
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={signOut}
            disabled={signingOut}
            aria-busy={signingOut}
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Sign out"
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
