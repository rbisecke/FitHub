"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type {
  UserProfile,
  WeightUnit,
  DistanceUnit,
  GraphColourMode,
} from "@/lib/api";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FREQUENCY_DEBOUNCE_MS = 300;

/**
 * A 2-option segmented pick, styled like GoalGrid/EquipmentGrid's proven
 * full-fill selection treatment. The shared ToggleGroup primitive's built-in
 * "pressed" style (bg-muted) reads as near-invisible against this section's
 * light card background, so this renders its own selected state directly
 * rather than relying on that primitive here.
 */
function UnitPicker<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt)}
              className={cn(
                "min-h-9 min-w-11 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/50",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Settings section (08 §3, FR §3.7). Every toggle is optimistic with a
 * revert-on-failure + toast; the frequency stepper additionally debounces
 * 300ms so dragging doesn't fire a PATCH per tick.
 */
export function SettingsSection({
  token,
  profile,
  onProfileChange,
}: {
  token: string;
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
}) {
  const [frequency, setFrequency] = useState(profile.frequency_target_days);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync the local slider value when the saved profile value changes (e.g.
  // an external refetch) — adjusted during render rather than in an effect,
  // per React's guidance for resetting state derived from props.
  const [syncedFrequency, setSyncedFrequency] = useState(
    profile.frequency_target_days,
  );
  if (profile.frequency_target_days !== syncedFrequency) {
    setSyncedFrequency(profile.frequency_target_days);
    setFrequency(profile.frequency_target_days);
  }

  function handleFrequencyChange(next: number) {
    setFrequency(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const updated = await api.profile.patch(token, {
          frequency_target_days: next,
        });
        onProfileChange(updated);
      } catch {
        setFrequency(profile.frequency_target_days);
        toast.error("Couldn't save frequency target. Please try again.");
      }
    }, FREQUENCY_DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function toggleCheckin(next: boolean) {
    onProfileChange({ ...profile, checkin_enabled: next });
    try {
      const updated = await api.profile.patch(token, { checkin_enabled: next });
      onProfileChange(updated);
    } catch {
      onProfileChange({ ...profile, checkin_enabled: !next });
      toast.error("Couldn't save that setting. Please try again.");
    }
  }

  async function setGraphColourMode(next: GraphColourMode) {
    const prev = profile.graph_colour_mode;
    onProfileChange({ ...profile, graph_colour_mode: next });
    try {
      const updated = await api.profile.patch(token, {
        graph_colour_mode: next,
      });
      onProfileChange(updated);
    } catch {
      onProfileChange({ ...profile, graph_colour_mode: prev });
      toast.error("Couldn't save that setting. Please try again.");
    }
  }

  async function setWeightUnit(next: WeightUnit) {
    const prev = profile.weight_unit;
    onProfileChange({ ...profile, weight_unit: next });
    try {
      const updated = await api.profile.patch(token, { weight_unit: next });
      onProfileChange(updated);
    } catch {
      onProfileChange({ ...profile, weight_unit: prev });
      toast.error("Couldn't save that setting. Please try again.");
    }
  }

  async function setDistanceUnit(next: DistanceUnit) {
    const prev = profile.distance_unit;
    onProfileChange({ ...profile, distance_unit: next });
    try {
      const updated = await api.profile.patch(token, { distance_unit: next });
      onProfileChange(updated);
    } catch {
      onProfileChange({ ...profile, distance_unit: prev });
      toast.error("Couldn't save that setting. Please try again.");
    }
  }

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5">
      <h2 className="type-h3">Settings</h2>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="frequency-slider">Frequency target</Label>
          <span className="type-num-inline">{frequency}x / week</span>
        </div>
        <Slider
          id="frequency-slider"
          min={1}
          max={7}
          step={1}
          value={[frequency]}
          onValueChange={(v) => handleFrequencyChange((v as number[])[0]!)}
          aria-label="Weekly frequency target"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="checkin-toggle">Session reminders</Label>
          <p className="type-caption">
            show a prompt every 4 weeks to review your frequency goal
          </p>
        </div>
        <Switch
          id="checkin-toggle"
          checked={profile.checkin_enabled}
          onCheckedChange={toggleCheckin}
        />
      </div>

      <UnitPicker
        label="Graph colour mode"
        value={profile.graph_colour_mode}
        options={["intensity", "volume"] as const}
        onChange={(v) => setGraphColourMode(v as GraphColourMode)}
      />

      <UnitPicker
        label="Weight unit"
        value={profile.weight_unit}
        options={["kg", "lb"] as const}
        onChange={(v) => setWeightUnit(v as WeightUnit)}
      />

      <UnitPicker
        label="Distance unit"
        value={profile.distance_unit}
        options={["km", "mi"] as const}
        onChange={(v) => setDistanceUnit(v as DistanceUnit)}
      />

      <p className="type-caption">
        FitHub uses your device&apos;s theme by default.
      </p>

      <div className="flex items-center justify-between gap-4 opacity-50">
        <div className="flex flex-col gap-0.5">
          <Label>Notifications</Label>
          <p className="type-caption">coming soon</p>
        </div>
        <Switch
          checked={false}
          disabled
          aria-label="Notifications (coming soon)"
        />
      </div>
    </section>
  );
}
