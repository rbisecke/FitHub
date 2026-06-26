"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditIdentitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  accessToken: string;
  onSaved: (updated: UserProfile) => void;
}

interface FormValues {
  display_name: string;
  bio: string;
  location: string;
  box_affiliation: string;
  training_since: string;
}

const MAX_BIO = 160;

export function EditIdentitySheet({
  open,
  onOpenChange,
  profile,
  accessToken,
  onSaved,
}: EditIdentitySheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      box_affiliation: profile.box_affiliation ?? "",
      training_since: profile.training_since ?? "",
    },
  });

  const bioValue = watch("bio");

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.profile.patch(accessToken, {
        display_name: data.display_name || null,
        bio: data.bio || null,
        location: data.location || null,
        box_affiliation: data.box_affiliation || null,
        training_since: data.training_since || null,
      });
      onSaved(updated);
      onOpenChange(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-[#0d1117] border-[#30363d] flex flex-col"
      >
        <SheetHeader className="border-b border-[#30363d] pb-4">
          <SheetTitle className="font-mono text-sm text-[#8b949e]">
            $ git config --edit
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col overflow-y-auto"
        >
          <div className="px-4 py-6 space-y-5">
            {/* Display name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-display-name"
                className="text-xs font-mono text-[#8b949e] uppercase tracking-wide"
              >
                Display name
              </Label>
              <Input
                id="edit-display-name"
                {...register("display_name")}
                placeholder="Your name"
                className="bg-[#161b22] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#58a6ff]"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="edit-bio"
                  className="text-xs font-mono text-[#8b949e] uppercase tracking-wide"
                >
                  Bio
                </Label>
                <span
                  className={`font-mono text-xs ${
                    (bioValue?.length ?? 0) > MAX_BIO
                      ? "text-[#ff7b72]"
                      : "text-[#8b949e]"
                  }`}
                  aria-live="polite"
                  aria-label={`${
                    bioValue?.length ?? 0
                  } of ${MAX_BIO} characters`}
                >
                  {bioValue?.length ?? 0}/{MAX_BIO}
                </span>
              </div>
              <Input
                id="edit-bio"
                {...register("bio", {
                  maxLength: {
                    value: MAX_BIO,
                    message: `Bio must be ${MAX_BIO} characters or fewer`,
                  },
                })}
                placeholder="A short bio"
                maxLength={MAX_BIO}
                className="bg-[#161b22] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#58a6ff]"
              />
              {errors.bio && (
                <p className="text-xs text-[#ff7b72]" role="alert">
                  {errors.bio.message}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-location"
                className="text-xs font-mono text-[#8b949e] uppercase tracking-wide"
              >
                Location
              </Label>
              <Input
                id="edit-location"
                {...register("location")}
                placeholder="City, Country"
                className="bg-[#161b22] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#58a6ff]"
              />
            </div>

            {/* Box / Gym */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-box"
                className="text-xs font-mono text-[#8b949e] uppercase tracking-wide"
              >
                Box / Gym
              </Label>
              <Input
                id="edit-box"
                {...register("box_affiliation")}
                placeholder="CrossFit HQ"
                className="bg-[#161b22] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#58a6ff]"
              />
            </div>

            {/* Training since */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-training-since"
                className="text-xs font-mono text-[#8b949e] uppercase tracking-wide"
              >
                Training since
              </Label>
              <Input
                id="edit-training-since"
                {...register("training_since")}
                type="date"
                className="bg-[#161b22] border-[#30363d] text-[#e6edf3] focus-visible:border-[#58a6ff] [color-scheme:dark]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#ff7b72] font-mono">{error}</p>
            )}
          </div>

          <div className="px-4 pb-6 pt-2 border-t border-[#30363d]">
            <Button
              type="submit"
              disabled={saving || (bioValue?.length ?? 0) > MAX_BIO}
              className="w-full bg-[#58a6ff] hover:bg-[#58a6ff]/90 text-[#0d1117] font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
