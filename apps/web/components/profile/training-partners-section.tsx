"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import type { TrainingPartner, UserSearchResult } from "@/lib/api";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const emailSchema = z.object({ email: z.email("Enter a valid email") });
type EmailValues = z.infer<typeof emailSchema>;

/**
 * Training partners (08 §3, FR §3.6) — exact-email add, plus member search
 * (FR §3.5, step 2.20) surfaced here since it has no dedicated route of its
 * own in this Effort's IA.
 */
export function TrainingPartnersSection({
  token,
  loading,
  partners,
  onPartnersChange,
}: {
  token: string;
  loading: boolean;
  partners: TrainingPartner[];
  onPartnersChange: (partners: TrainingPartner[]) => void;
}) {
  const [addState, setAddState] = useState<
    "idle" | "loading" | "not_found" | "error"
  >("idle");

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: EmailValues) {
    setAddState("loading");
    try {
      const partner = await api.addTrainingPartner(token, values.email);
      onPartnersChange([...partners, partner]);
      form.reset();
      setAddState("idle");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setAddState("not_found");
      } else {
        setAddState("error");
      }
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 className="type-h3">Training partners</h2>

      {loading ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : partners.length === 0 ? (
        <p className="type-small text-muted-foreground">
          Add a training partner by email
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {partners.map((p) => (
            <li
              key={p.user_id ?? `guest-${p.guest_name}`}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <AvatarMonogram
                name={p.display_name}
                isGuest={p.user_id === null}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="type-small font-medium">
                  {p.display_name}
                  {p.user_id === null && (
                    <span className="type-caption ml-1.5">guest</span>
                  )}
                </span>
                <span className="type-caption">
                  {p.session_count} session{p.session_count === 1 ? "" : "s"}
                  {p.most_common_format ? ` · ${p.most_common_format}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-start gap-2"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="partner@example.com"
                    onChange={(e) => {
                      field.onChange(e);
                      setAddState("idle");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={addState === "loading"}
            aria-busy={addState === "loading"}
          >
            {addState === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Add"
            )}
          </Button>
        </form>
      </Form>
      {addState === "not_found" && (
        <p role="alert" className="type-caption text-destructive">
          No account found for that email. They may need an invitation.
        </p>
      )}
      {addState === "error" && (
        <p role="alert" className="type-caption text-destructive">
          Couldn&apos;t add that partner. Please try again.
        </p>
      )}

      <MemberSearch token={token} />
    </section>
  );
}

function MemberSearch({ token }: { token: string }) {
  const [query, setQuery] = useState("");
  const [rawResults, setRawResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Filtered at render rather than cleared inside the effect body, so the
  // effect only ever setStates from within its async callbacks.
  const results = query.trim().length < 2 ? [] : rawResults;

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setSearching(true);
      api.profiles
        .search(token, query, { signal: controller.signal })
        .then((r) => {
          if (!cancelled) setRawResults(r);
        })
        .catch(() => {
          if (!cancelled && !controller.signal.aborted) setRawResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, token]);

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-4">
      <span className="type-small font-medium">Find members</span>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        aria-label="Search members"
      />
      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="type-caption">Keep typing…</p>
      )}
      {searching && (
        <p className="type-caption flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Searching…
        </p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((r) => (
            <li
              key={r.user_id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <AvatarMonogram
                name={r.display_name ?? "Member"}
                seed={r.user_id}
                size="sm"
              />
              <span className="type-small">{r.display_name ?? "Member"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
