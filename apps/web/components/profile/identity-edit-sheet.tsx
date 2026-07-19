"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { PrimaryGoal, EquipmentAccess, UserProfile } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GoalGrid } from "./goal-grid";
import { EquipmentGrid } from "./equipment-grid";

const BIO_MAX = 160;

const schema = z.object({
  display_name: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(BIO_MAX).optional(),
  location: z.string().trim().max(200).optional(),
  box_affiliation: z.string().trim().max(200).optional(),
  training_since: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/**
 * Identity edit sheet (08 §3). Patches display_name/bio/location/
 * box_affiliation/training_since plus primary_goal and equipment_access.
 *
 * training_age is deliberately NOT offered here: the spec asks for a plain
 * overwrite of a persisted profile field, but no such field exists on
 * UserProfile yet (only training_level, a distinct 5-value field consumed
 * solely by coach-chat — writing training_age's answer into training_level
 * would silently corrupt a different setting). Adding that column is
 * out of scope for this Effort's frontend-only slice, so the control is
 * omitted rather than wired to the wrong field.
 */
export function IdentityEditSheet({
  open,
  onOpenChange,
  token,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  profile: UserProfile;
  onSaved: (profile: UserProfile) => void;
}) {
  const [goal, setGoal] = useState<PrimaryGoal | null>(
    profile.primary_goal ?? null,
  );
  const [equipment, setEquipment] = useState<EquipmentAccess[]>(
    profile.equipment_access ?? [],
  );
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      box_affiliation: profile.box_affiliation ?? "",
      training_since: profile.training_since ?? "",
    },
  });

  const bioValue = form.watch("bio") ?? "";

  async function onSubmit(values: Values) {
    setSaving(true);
    try {
      const updated = await api.profile.patch(token, {
        display_name: values.display_name || null,
        bio: values.bio || null,
        location: values.location || null,
        box_affiliation: values.box_affiliation || null,
        training_since: values.training_since || null,
        primary_goal: goal ?? undefined,
        equipment_access: equipment.length > 0 ? equipment : undefined,
      });
      onSaved(updated);
      onOpenChange(false);
      toast.success("Profile updated.");
    } catch {
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Sheet content portals to document.body, escaping the profile page's
          ForcedTheme DOM subtree — CSS custom properties follow the DOM tree,
          not the React tree, so the sheet needs its own explicit light scope
          to stay consistent with the light page it edits. */}
      <SheetContent
        side="right"
        data-theme="light"
        className="flex w-full flex-col overflow-hidden bg-background text-foreground sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={50} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea {...field} maxLength={BIO_MAX} rows={3} />
                    </FormControl>
                    <p className="type-caption text-right">
                      {bioValue.length}/{BIO_MAX}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={200} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="box_affiliation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Box / gym</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={200} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="training_since"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training since</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Primary goal</span>
                <GoalGrid value={goal} onChange={setGoal} />
              </div>

              <div className="flex flex-col gap-2 pb-2">
                <span className="text-sm font-medium">Equipment access</span>
                <EquipmentGrid value={equipment} onChange={setEquipment} />
              </div>
            </div>

            {/* Sticky footer: a sibling of the scrollable body above, not
                inside it, so Save stays reachable without scrolling to the
                very end of a long form. */}
            <SheetFooter className="shrink-0 border-t border-border bg-background px-4">
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  "Save changes"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
