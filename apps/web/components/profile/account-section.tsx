"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/** Account section (08 §3, FR §3.7): sign-out + the mandated deletion note. */
export function AccountSection() {
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
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 className="type-h3">Account</h2>
      <Button
        type="button"
        variant="outline"
        onClick={signOut}
        disabled={signingOut}
        aria-busy={signingOut}
        className="self-start"
      >
        {signingOut ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          "Sign out"
        )}
      </Button>
      <p className="type-caption border-t border-border pt-4">
        To delete your account, contact support.
      </p>
    </section>
  );
}
