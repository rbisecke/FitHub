"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

interface Props {
  initial: boolean;
  token: string;
}

export function CheckinToggle({ initial, token }: Props) {
  const [checked, setChecked] = useState(initial);

  function handleChange(v: boolean) {
    setChecked(v);
    api.profile
      .patch(token, { checkin_enabled: v })
      .then(() =>
        toast.success("Settings saved.", {
          id: "settings-save",
          duration: 2000,
        }),
      )
      .catch(() => {
        setChecked(!v);
        toast.error("Failed to save. Try again.", { duration: 4000 });
      });
  }

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-[#e6edf3]">4-week check-in</p>
        <p className="text-xs text-[#8b949e]">
          Show a prompt every 4 weeks to review your frequency goal
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={handleChange}
        aria-label="4-week check-in"
        className="data-[state=checked]:bg-[#58a6ff] shrink-0"
      />
    </div>
  );
}
