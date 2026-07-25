"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GitBranch,
  Mail,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
import { GoogleMark, GitHubMark } from "./provider-marks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RESEND_WAIT_S = 45;
const MOTIVATION_MIN = 15;
const MOTIVATION_MAX = 2000;

// ── Schemas (RHF + Zod v4) ────────────────────────────────────────────────────
const signInSchema = z.object({ email: z.email("Enter a valid email") });
type SignInValues = z.infer<typeof signInSchema>;

const requestSchema = z.object({
  email: z.email("Enter a valid email").max(254),
  name: z.string().trim().max(200).optional(),
  motivation: z
    .string()
    .trim()
    .min(
      MOTIVATION_MIN,
      `Tell us a bit more (min ${MOTIVATION_MIN} characters)`,
    )
    .max(MOTIVATION_MAX),
});
type RequestValues = z.infer<typeof requestSchema>;

type View = "signin" | "request";
type OAuthProvider = "google" | "github";
type MagicState = "idle" | "loading" | "sent" | "error";
type ReqState =
  | "idle"
  | "loading"
  | "success"
  | "duplicate"
  | "ratelimit"
  | "error";

/**
 * Sign-in / request-access screen (08 §1, steps 2.1–2.3).
 *
 * One dark centered column; the magic-link path carries the single hero accent,
 * OAuth buttons are neutral. Request-access is an in-place expand, not a route
 * change. Every form→panel transition moves focus to the new panel heading and
 * announces via a live region. All Supabase/API logic is preserved verbatim from
 * the pre-redesign form; only the presentation is rebuilt.
 */
export function SignInScreen({
  initialError,
  sessionExpired,
  initialView = "signin",
}: {
  initialError?: string;
  sessionExpired?: boolean;
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const [magicState, setMagicState] = useState<MagicState>("idle");
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(
    initialError
      ? "Something went wrong. Try again or use a magic link."
      : null,
  );
  const [sentEmail, setSentEmail] = useState("");
  const [resendIn, setResendIn] = useState(RESEND_WAIT_S);
  const [reqState, setReqState] = useState<ReqState>("idle");
  const [reqError, setReqError] = useState("");

  const sentPanelRef = useRef<HTMLDivElement>(null);
  const successPanelRef = useRef<HTMLDivElement>(null);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });
  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "", name: "", motivation: "" },
    mode: "onBlur",
  });
  const motivation = requestForm.watch("motivation") ?? "";

  const anyAuthLoading = magicState === "loading" || oauthLoading !== null;

  // Session-expired arrives as a soft toast on the sign-in screen (08 §1).
  useEffect(() => {
    if (sessionExpired)
      toast.warning("Your session expired — please sign in again.");
  }, [sessionExpired]);

  // Focus the magic-link-sent panel when it appears (keyboard/SR land inside it).
  useEffect(() => {
    if (magicState === "sent") sentPanelRef.current?.focus();
  }, [magicState]);
  useEffect(() => {
    if (reqState === "success") successPanelRef.current?.focus();
  }, [reqState]);

  // Resend countdown for the magic-link-sent panel.
  useEffect(() => {
    if (magicState !== "sent" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [magicState, resendIn]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function sendMagicLink(email: string) {
    setOauthError(null);
    setMagicState("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // New-user creation is gated by the before_user_created hook in Supabase
        // (checks public.invited_emails). Must be true so the hook fires.
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMagicState("error");
    } else {
      setSentEmail(email);
      setResendIn(RESEND_WAIT_S);
      setMagicState("sent");
    }
  }

  const onSignIn = signInForm.handleSubmit((v) => sendMagicLink(v.email));

  async function handleOAuth(provider: OAuthProvider) {
    setOauthLoading(provider);
    setOauthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === "github" ? "user:email" : undefined,
      },
    });
    if (error) {
      setOauthError("Something went wrong. Try again or use a magic link.");
      setOauthLoading(null);
    }
    // On success the browser navigates away — loading persists until redirect.
  }

  const onRequest = requestForm.handleSubmit(async (values) => {
    setReqError("");
    setReqState("loading");
    try {
      const res = await fetch(`${API_BASE}/api/v1/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          name: values.name || undefined,
          motivation: values.motivation,
        }),
      });
      if (res.status === 200 || res.status === 201) {
        setReqState("success");
      } else if (res.status === 409) {
        setReqState("duplicate");
      } else if (res.status === 429) {
        setReqState("ratelimit");
        setReqError("Too many requests — try again tomorrow.");
      } else {
        setReqState("error");
        setReqError("Please try again.");
      }
    } catch {
      setReqState("error");
      setReqError("Please check your connection and try again.");
    }
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center bg-background px-5 py-10 text-foreground"
      style={{
        backgroundImage:
          "radial-gradient(900px 480px at 50% -10%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%)",
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Brand lockup — small, quiet */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GitBranch className="size-5" aria-hidden />
            </span>
            <span className="type-h3">FitHub</span>
          </div>
          <p className="type-small text-muted-foreground">
            Your training, version-controlled.
          </p>
        </div>

        {view === "signin" ? (
          magicState === "sent" ? (
            <MagicLinkSentPanel
              ref={sentPanelRef}
              email={sentEmail}
              resendIn={resendIn}
              onResend={() => sendMagicLink(sentEmail)}
              onUseDifferent={() => {
                setMagicState("idle");
                signInForm.reset();
              }}
            />
          ) : (
            <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
              <div className="flex flex-col gap-1">
                <h1 className="type-h3">Sign in</h1>
                <p className="type-small text-muted-foreground">
                  Invite-only. Sign in with your preferred method below.
                </p>
              </div>

              {oauthError && (
                <p role="alert" className="type-small text-[color:var(--red)]">
                  {oauthError}
                </p>
              )}

              <Form {...signInForm}>
                <form
                  onSubmit={onSignIn}
                  noValidate
                  className="flex flex-col gap-3"
                >
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full"
                    disabled={anyAuthLoading}
                    aria-busy={magicState === "loading"}
                  >
                    {magicState === "loading" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      "Send magic link"
                    )}
                  </Button>
                  {magicState === "error" && (
                    <p
                      role="status"
                      aria-live="polite"
                      className="type-caption text-muted-foreground"
                    >
                      If that email is on our invite list, you&apos;ll receive a
                      magic link.
                    </p>
                  )}
                </form>
              </Form>

              {/* Divider */}
              <div className="flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                <span className="type-caption text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => handleOAuth("google")}
                  disabled={anyAuthLoading}
                  aria-busy={oauthLoading === "google"}
                >
                  {oauthLoading === "google" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <GoogleMark />
                      Continue with Google
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => handleOAuth("github")}
                  disabled={anyAuthLoading}
                  aria-busy={oauthLoading === "github"}
                >
                  {oauthLoading === "github" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <GitHubMark />
                      Continue with GitHub
                    </>
                  )}
                </Button>
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="link"
                  className="h-11 text-[color:var(--accent)] underline-offset-4 hover:underline focus-visible:underline"
                  onClick={() => setView("request")}
                >
                  Not invited yet? Request access.
                </Button>
              </div>
            </div>
          )
        ) : reqState === "success" ? (
          <RequestReceivedPanel
            ref={successPanelRef}
            onBack={() => {
              setView("signin");
              setReqState("idle");
              requestForm.reset();
            }}
          />
        ) : (
          <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
            <div className="flex flex-col gap-1">
              <h1 className="type-h3">Request access</h1>
              <p className="type-small text-muted-foreground">
                Not on the list? Tell us how you train and we&apos;ll get you
                in.
              </p>
            </div>

            <Form {...requestForm}>
              <form
                onSubmit={onRequest}
                noValidate
                className="flex flex-col gap-3"
              >
                <FormField
                  control={requestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={requestForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Name{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="name"
                          placeholder="Dana"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={requestForm.control}
                  name="motivation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How you train</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="I've been doing CrossFit for 3 years…"
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span
                          className={`type-caption ml-auto font-mono tabular-nums ${
                            motivation.trim().length < MOTIVATION_MIN
                              ? "text-[color:var(--amber)]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {motivation.length}/{MOTIVATION_MAX}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                {reqState === "duplicate" && (
                  <StatusNote
                    tone="amber"
                    icon={<AlertTriangle className="size-4" aria-hidden />}
                  >
                    You&apos;ve already got a request in — we&apos;ll be in
                    touch.
                  </StatusNote>
                )}
                {(reqState === "ratelimit" || reqState === "error") &&
                  reqError && (
                    <StatusNote
                      tone="red"
                      icon={<AlertTriangle className="size-4" aria-hidden />}
                    >
                      {reqError}
                    </StatusNote>
                  )}

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={reqState === "loading"}
                  aria-busy={reqState === "loading"}
                >
                  {reqState === "loading" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    "Request access"
                  )}
                </Button>
              </form>
            </Form>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="link"
                className="h-11 text-muted-foreground"
                onClick={() => {
                  setView("signin");
                  setReqState("idle");
                }}
              >
                ← Back to sign in
              </Button>
            </div>
          </div>
        )}

        <p className="type-caption text-center text-muted-foreground">
          Protected by magic-link auth
        </p>
      </div>
    </main>
  );
}

// ── Sub-panels ─────────────────────────────────────────────────────────────
function MagicLinkSentPanel({
  ref,
  email,
  resendIn,
  onResend,
  onUseDifferent,
}: {
  ref: React.Ref<HTMLDivElement>;
  email: string;
  resendIn: number;
  onResend: () => void;
  onUseDifferent: () => void;
}) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 outline-none"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--green)]/15 text-[color:var(--green)]">
          <Mail className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="type-body font-semibold">Check your inbox</h1>
          <p className="type-small text-muted-foreground">
            If that email is on our invite list, you&apos;ll receive a magic
            link
            {email ? (
              <>
                {" "}
                at <span className="text-foreground">{email}</span>
              </>
            ) : null}
            .
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={onResend}
        disabled={resendIn > 0}
      >
        {resendIn > 0 ? (
          <span className="font-mono tabular-nums">
            Resend link in {resendIn}s
          </span>
        ) : (
          "Didn't get it? Resend link"
        )}
      </Button>
      <Button
        type="button"
        variant="link"
        className="h-11 text-muted-foreground"
        onClick={onUseDifferent}
      >
        ← Use a different email
      </Button>
    </div>
  );
}

function RequestReceivedPanel({
  ref,
  onBack,
}: {
  ref: React.Ref<HTMLDivElement>;
  onBack: () => void;
}) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 outline-none"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--green)]/15 text-[color:var(--green)]">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="type-body font-semibold">Request received</h1>
          <p className="type-small text-muted-foreground">
            We&apos;ll reach out when there&apos;s a spot.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="link"
        className="h-11 text-muted-foreground"
        onClick={onBack}
      >
        ← Back to sign in
      </Button>
    </div>
  );
}

const NOTE_TONE = {
  amber: "border-[color:var(--amber)]/40 text-[color:var(--amber)]",
  red: "border-[color:var(--red)]/40 text-[color:var(--red)]",
} as const;

function StatusNote({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof NOTE_TONE;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-md border p-3 ${NOTE_TONE[tone]}`}
    >
      <span className="mt-px shrink-0">{icon}</span>
      <p className="type-small text-muted-foreground">{children}</p>
    </div>
  );
}
