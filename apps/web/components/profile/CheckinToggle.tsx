"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { ToggleSwitch } from "./ToggleSwitch";

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
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Session reminders
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          Show a prompt every 4 weeks to review your frequency goal
        </p>
      </div>
      <ToggleSwitch
        checked={checked}
        onChange={handleChange}
        aria-label="4-week check-in reminders"
      />
    </div>
  );
}
