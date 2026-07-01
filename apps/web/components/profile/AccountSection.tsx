"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email?: string;
}

export function AccountSection({ email }: Props) {
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
      {email && (
        <div className="flex items-center justify-between">
          <span className="font-data text-[13px] truncate text-[var(--foreground)]">
            {email}
          </span>
          <span
            className="font-data text-[9.5px] text-[var(--muted)] px-[8px] py-[2px] rounded-full flex-shrink-0 ml-2"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            read-only
          </span>
        </div>
      )}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="font-data text-[13px] bg-transparent border-none cursor-pointer p-0 disabled:opacity-50"
        style={{ color: "var(--red)" }}
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
      <p className="text-xs text-[#8b949e]">
        To delete your account, contact support.
      </p>
    </div>
  );
}
