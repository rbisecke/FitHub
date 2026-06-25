"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AccountSection() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out failed. Try again.", { duration: 4000 });
      setSigningOut(false);
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="py-3 space-y-3">
      <Button
        variant="outline"
        className="w-full border-[#30363d] text-[#e6edf3] hover:bg-[#161b22] font-sans min-h-[44px]"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
      <p className="text-xs text-[#8b949e]">
        To delete your account, contact support.
      </p>
    </div>
  );
}
