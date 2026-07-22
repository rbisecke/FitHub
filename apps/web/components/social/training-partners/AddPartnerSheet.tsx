"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "@/lib/api/client";
import type { TrainingPartner } from "@/lib/api";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const emailSchema = z.object({
  email: z.email("Enter a valid email").max(254),
});
type EmailValues = z.infer<typeof emailSchema>;

type AddStatus =
  | "idle"
  | "loading"
  | "added"
  | "not_found"
  | "already"
  | "error";

/**
 * Add training partner by email (06 §8b) — GitHub's Follow model: one field,
 * one button, instant, one-directional. Success flips the button to an
 * "Added" state in place with no toast/confirm dialog (the state change is
 * the confirmation, per the domain's no-toast rule). 404/409 are both
 * informational, not error-red — they're normal outcomes of a closed,
 * invite-only population, not failures.
 */
export function AddPartnerSheet({
  token,
  onAdded,
  onClose,
}: {
  token: string;
  onAdded: (partner: TrainingPartner) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AddStatus>("idle");

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: EmailValues) {
    setStatus("loading");
    try {
      const partner = await api.addTrainingPartner(
        token,
        values.email.trim().toLowerCase(),
      );
      onAdded(partner);
      setStatus("added");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("not_found");
      } else if (err instanceof ApiError && err.status === 409) {
        setStatus("already");
      } else {
        setStatus("error");
      }
    }
  }

  return (
    <SheetOverlay
      title="Add training partner"
      onClose={() => (status === "loading" ? undefined : onClose())}
      maxHeight="46dvh"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    disabled={status === "loading"}
                    placeholder="partner@example.com"
                    aria-label="Partner email"
                    onChange={(e) => {
                      field.onChange(e);
                      setStatus((s) => (s === "loading" ? s : "idle"));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={status === "loading" || status === "added"}
            aria-busy={status === "loading"}
          >
            {status === "added"
              ? "Added"
              : status === "loading"
                ? "Adding…"
                : "Add partner"}
          </Button>
        </form>
      </Form>
      {status === "not_found" && (
        <p
          role="status"
          className="mt-3 font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          No account found for that email. They may need an invitation.
        </p>
      )}
      {status === "already" && (
        <p
          role="status"
          className="mt-3 font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          Already a training partner.
        </p>
      )}
      {status === "error" && (
        <p
          role="alert"
          className="mt-3 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          Couldn&apos;t add that partner. Please try again.
        </p>
      )}
    </SheetOverlay>
  );
}
