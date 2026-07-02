"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Icons ────────────────────────────────────────────────────────────────────

function GitBranchIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0d1117"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <line x1="6" y1="9" x2="6" y2="15" />
      <path d="M9 6h5a4 4 0 0 1 4 4" />
    </svg>
  );
}

function LoginArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--gold)"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FieldErrorIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--red)"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function Spinner({
  borderColor = "rgba(13,17,23,.3)",
  topColor = "#0d1117",
}: {
  borderColor?: string;
  topColor?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 15,
        height: 15,
        borderRadius: "50%",
        border: `2px solid ${borderColor}`,
        borderTopColor: topColor,
        animation: "fh-spin .6s linear infinite",
      }}
    />
  );
}

function GoogleIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubAuthIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="var(--text)"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MagicState = "idle" | "loading" | "sent" | "error";
type OAuthProvider = "google" | "github";
type ReqState =
  | "idle"
  | "loading"
  | "success"
  | "duplicate"
  | "ratelimit"
  | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginForm({ initialError }: { initialError?: string }) {
  // Sign-in state
  const [signEmail, setSignEmail] = useState("");
  const [signEmailError, setSignEmailError] = useState("");
  const [magicState, setMagicState] = useState<MagicState>("idle");
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(
    initialError
      ? "Something went wrong. Try again or use a magic link."
      : null,
  );

  // Request access state
  const [reqEmail, setReqEmail] = useState("");
  const [reqEmailError, setReqEmailError] = useState("");
  const [motivation, setMotivation] = useState("");
  const [motivationError, setMotivationError] = useState("");
  const [reqState, setReqState] = useState<ReqState>("idle");
  const [reqError, setReqError] = useState("");

  const anyAuthLoading = magicState === "loading" || oauthLoading !== null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSignEmailError("");
    setOauthError(null);
    if (!signEmail) {
      setSignEmailError("Email is required.");
      return;
    }
    setMagicState("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: signEmail,
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
      setMagicState("sent");
    }
  }

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
    // On success the browser navigates away — loading state persists until redirect.
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;
    setReqEmailError("");
    setMotivationError("");
    setReqError("");

    if (!reqEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail)) {
      setReqEmailError("A valid email is required.");
      hasError = true;
    }
    if (motivation.trim().length < 15) {
      setMotivationError("Tell us a bit more (min 15 characters).");
      hasError = true;
    }
    if (hasError) return;

    setReqState("loading");
    try {
      const res = await fetch(`${API_BASE}/api/v1/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reqEmail, motivation }),
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
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex min-h-screen bg-[--bg] text-[--text]"
      style={
        {
          "--panel": "#161b22",
          "--panel2": "#21262d",
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        } as React.CSSProperties
      }
    >
      {/* Scoped styles: animations + hover states */}
      <style>{`
        @keyframes fh-spin { to { transform: rotate(360deg) } }
        @keyframes fh-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes fh-fadeUp { 0%{transform:translateY(10px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        .fh-fade-up { animation: fh-fadeUp .3s ease both; }
        .fh-cursor  { animation: fh-cursor-blink 1.1s steps(1) infinite; }
        .fh-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
        .fh-btn-secondary:hover:not(:disabled) { border-color: var(--muted) !important; }
        .fh-btn-request:hover:not(:disabled)  { border-color: var(--gold) !important; color: var(--gold) !important; }
        .fh-btn-back:hover  { color: var(--accent) !important; }
        .fh-input:focus     { border-color: var(--accent) !important; }
        @media (prefers-reduced-motion: reduce) {
          .fh-fade-up, .fh-cursor { animation-duration: .001ms !important; }
        }
      `}</style>

      {/* ── Left brand panel (desktop only) ─────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col justify-between flex-shrink-0 overflow-hidden border-r border-[--border]"
        style={{ width: "44%", maxWidth: 560, padding: "56px 52px" }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center bg-[--accent]"
            style={{ width: 38, height: 38, borderRadius: 10 }}
          >
            <GitBranchIcon />
          </div>
          <span
            className="font-heading"
            style={{ fontSize: 21, letterSpacing: "-.5px" }}
          >
            FitHub
          </span>
        </div>

        {/* Copy block */}
        <div>
          <div
            className="text-[--accent]"
            style={{ fontSize: 13, marginBottom: 14 }}
          >
            $ fithub auth --status
          </div>
          <h1
            className="font-heading"
            style={{
              fontSize: 38,
              lineHeight: 1.1,
              margin: "0 0 18px",
              letterSpacing: "-1.2px",
            }}
          >
            Your training,
            <br />
            version-controlled.
          </h1>
          <p
            className="text-[--muted]"
            style={{ fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 400 }}
          >
            Every workout is a commit. Every personal best is a tagged release.
            FitHub is invite-only — sign in below, or request access and tell us
            how you train.
          </p>
        </div>

        {/* Terminal block */}
        <div
          style={{
            background: "#070A0E",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              padding: "9px 13px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#FF5F56",
              }}
            />
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#FFBD2E",
              }}
            />
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#27C93F",
              }}
            />
            <span
              style={{
                fontSize: 10.5,
                color: "var(--muted)",
                marginLeft: 5,
              }}
            >
              auth.log
            </span>
          </div>
          {/* Terminal body */}
          <div style={{ padding: "14px 15px", fontSize: 12, lineHeight: 1.9 }}>
            <div>
              <span style={{ color: "var(--accent)" }}>➜</span>
              {"  "}
              <span style={{ color: "var(--blue)" }}>~</span>
              {"  git remote -v"}
            </div>
            <div>
              {"origin  fithub.app "}
              <span style={{ color: "var(--gold)" }}>(auth required)</span>
            </div>
            <div>
              <span style={{ color: "var(--accent)" }}>➜</span>
              {"  "}
              <span style={{ color: "var(--blue)" }}>~</span>
              {"  "}
              <span
                className="fh-cursor"
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 14,
                  background: "var(--text)",
                  verticalAlign: -3,
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right content panel ──────────────────────────────────────────── */}
      <main className="flex flex-1 min-w-0 items-center justify-center overflow-y-auto px-5 py-6 md:px-[40px] md:py-[48px]">
        <div
          className="fh-fade-up flex flex-col w-full"
          style={{ maxWidth: 420, gap: 22 }}
        >
          {/* Mobile logo (hidden on desktop) */}
          <div className="flex md:hidden items-center gap-3 mb-2">
            <div
              className="flex items-center justify-center bg-[--accent]"
              style={{ width: 34, height: 34, borderRadius: 9 }}
            >
              <GitBranchIcon />
            </div>
            <span className="font-heading" style={{ fontSize: 18 }}>
              FitHub
            </span>
          </div>

          {/* ── Sign-in card ─────────────────────────────────────────────── */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 26,
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(74,222,128,.14)",
                  border: "1px solid rgba(74,222,128,.3)",
                  borderRadius: 7,
                }}
              >
                <LoginArrowIcon />
              </div>
              <span
                className="font-heading"
                style={{ fontSize: 18, letterSpacing: "-.3px" }}
              >
                Sign in
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--muted)",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Invite-only. Sign in with your preferred method below.
            </p>

            {magicState === "sent" ? (
              /* Magic link sent state */
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 11,
                    background: "rgba(74,222,128,.1)",
                    border: "1px solid rgba(74,222,128,.3)",
                    borderRadius: 11,
                    padding: 15,
                  }}
                >
                  <MailIcon />
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--accent)",
                      }}
                    >
                      Magic link sent
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        marginTop: 3,
                      }}
                    >
                      Check{" "}
                      <span
                        style={{
                          color: "var(--text)",
                          fontWeight: 700,
                        }}
                      >
                        {signEmail}
                      </span>{" "}
                      for your sign-in link.
                    </div>
                  </div>
                </div>
                <button
                  className="fh-btn-back"
                  onClick={() => {
                    setMagicState("idle");
                    setSignEmail("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "14px 0 0",
                    display: "block",
                    width: "100%",
                    fontFamily: "inherit",
                    transition: "color 150ms ease",
                  }}
                >
                  ← use a different email
                </button>
              </div>
            ) : (
              /* Default / error state */
              <form onSubmit={handleMagicLink} noValidate>
                {/* OAuth error */}
                {oauthError && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--red)",
                      marginBottom: 14,
                    }}
                  >
                    {oauthError}
                  </p>
                )}

                {/* Email field */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="sign-email"
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="sign-email"
                    type="email"
                    autoComplete="email"
                    value={signEmail}
                    onChange={(e) => setSignEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="fh-input placeholder:text-[--muted] w-full"
                    style={{
                      background: "var(--panel2)",
                      border: `1px solid ${
                        signEmailError ? "var(--red)" : "var(--border)"
                      }`,
                      borderRadius: 10,
                      color: "var(--text)",
                      fontSize: 13.5,
                      padding: "11px 13px",
                      marginTop: 8,
                      outline: "none",
                      fontFamily: "inherit",
                      transition: "border-color 150ms ease",
                    }}
                  />
                  {signEmailError && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--red)",
                        marginTop: 7,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FieldErrorIcon />
                      {signEmailError}
                    </div>
                  )}
                </div>

                {/* Magic link button */}
                <button
                  type="submit"
                  disabled={anyAuthLoading}
                  className="fh-btn-primary"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "var(--accent)",
                    color: "#0d1117",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13.5,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: anyAuthLoading ? "not-allowed" : "pointer",
                    marginTop: 14,
                    fontFamily: "inherit",
                    transition: "filter 150ms ease",
                    opacity: anyAuthLoading ? 0.7 : 1,
                    minHeight: 44,
                  }}
                >
                  {magicState === "loading" ? (
                    <Spinner
                      borderColor="rgba(13,17,23,.3)"
                      topColor="#0d1117"
                    />
                  ) : (
                    "Send magic link"
                  )}
                </button>

                {magicState === "error" && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--muted)",
                      marginTop: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    If that email is on our invite list, you&apos;ll receive a
                    magic link.
                  </p>
                )}

                {/* Divider */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "18px 0",
                  }}
                >
                  <div
                    style={{ height: 1, flex: 1, background: "var(--border)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    or
                  </span>
                  <div
                    style={{ height: 1, flex: 1, background: "var(--border)" }}
                  />
                </div>

                {/* Google button */}
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={anyAuthLoading}
                  className="fh-btn-secondary"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    background: "var(--panel2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: anyAuthLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "border-color 150ms ease",
                    opacity: anyAuthLoading ? 0.7 : 1,
                    minHeight: 44,
                  }}
                >
                  {oauthLoading === "google" ? (
                    <Spinner
                      borderColor="var(--muted)"
                      topColor="var(--text)"
                    />
                  ) : (
                    <>
                      <GoogleIcon />
                      Continue with Google
                    </>
                  )}
                </button>

                {/* GitHub button */}
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  disabled={anyAuthLoading}
                  className="fh-btn-secondary"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    background: "var(--panel2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: anyAuthLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    transition: "border-color 150ms ease",
                    opacity: anyAuthLoading ? 0.7 : 1,
                    minHeight: 44,
                    marginTop: 8,
                  }}
                >
                  {oauthLoading === "github" ? (
                    <Spinner
                      borderColor="var(--muted)"
                      topColor="var(--text)"
                    />
                  ) : (
                    <>
                      <GitHubAuthIcon />
                      Continue with GitHub
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* ── Request access card ──────────────────────────────────────── */}
          <div
            style={{
              background: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: 16,
              padding: 26,
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,200,61,.14)",
                  border: "1px solid rgba(255,200,61,.3)",
                  borderRadius: 7,
                }}
              >
                <UserPlusIcon />
              </div>
              <span
                className="font-heading"
                style={{ fontSize: 18, letterSpacing: "-.3px" }}
              >
                Request access
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--muted)",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Not on the list? Tell us how you train and we&apos;ll get you in.
            </p>

            {reqState === "success" ? (
              /* Success state */
              <div
                style={{
                  display: "flex",
                  gap: 11,
                  background: "rgba(74,222,128,.1)",
                  border: "1px solid rgba(74,222,128,.3)",
                  borderRadius: 11,
                  padding: 15,
                }}
              >
                <CheckCircleIcon />
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--accent)",
                    }}
                  >
                    Request received
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      lineHeight: 1.5,
                      marginTop: 3,
                    }}
                  >
                    We&apos;ll reach out to{" "}
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>
                      {reqEmail}
                    </span>{" "}
                    when there&apos;s a spot.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} noValidate>
                {/* Email field */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="req-email"
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="req-email"
                    type="email"
                    autoComplete="email"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="fh-input placeholder:text-[--muted] w-full"
                    style={{
                      background: "var(--panel2)",
                      border: `1px solid ${
                        reqEmailError ? "var(--red)" : "var(--border)"
                      }`,
                      borderRadius: 10,
                      color: "var(--text)",
                      fontSize: 13.5,
                      padding: "11px 13px",
                      marginTop: 8,
                      outline: "none",
                      fontFamily: "inherit",
                      transition: "border-color 150ms ease",
                    }}
                  />
                  {reqEmailError && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--red)",
                        marginTop: 7,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FieldErrorIcon />
                      {reqEmailError}
                    </div>
                  )}
                </div>

                {/* Motivation textarea */}
                <div>
                  <label
                    htmlFor="motivation"
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                    }}
                  >
                    How you train <span style={{ color: "var(--hot)" }}>*</span>
                  </label>
                  <textarea
                    id="motivation"
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="I've been doing CrossFit for 3 years..."
                    className="fh-input placeholder:text-[--muted] w-full"
                    style={{
                      background: "var(--panel2)",
                      border: `1px solid ${
                        motivationError ? "var(--red)" : "var(--border)"
                      }`,
                      borderRadius: 10,
                      color: "var(--text)",
                      fontSize: 13.5,
                      padding: "11px 13px",
                      marginTop: 8,
                      outline: "none",
                      fontFamily: "inherit",
                      minHeight: 88,
                      resize: "vertical",
                      lineHeight: 1.6,
                      transition: "border-color 150ms ease",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--muted)",
                      display: "block",
                      textAlign: "right",
                      marginTop: 7,
                    }}
                  >
                    {motivation.length} chars
                  </span>
                  {motivationError && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--red)",
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FieldErrorIcon />
                      {motivationError}
                    </div>
                  )}
                </div>

                {/* Duplicate pending alert */}
                {reqState === "duplicate" && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      background: "rgba(255,200,61,.1)",
                      border: "1px solid rgba(255,200,61,.3)",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <AlertIcon color="var(--gold)" />
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "var(--gold)" }}>
                        Already pending.
                      </span>{" "}
                      Your request is in the queue — we&apos;ll reach out soon.
                    </div>
                  </div>
                )}

                {/* Error alert (rate-limit or general) */}
                {(reqState === "error" || reqState === "ratelimit") &&
                  reqError && (
                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 10,
                        background: "rgba(248,81,73,.1)",
                        border: "1px solid rgba(248,81,73,.3)",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <AlertIcon color="var(--red)" />
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--red)" }}>
                          Couldn&apos;t submit.
                        </span>{" "}
                        {reqError}
                      </div>
                    </div>
                  )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={reqState === "loading"}
                  className="fh-btn-request"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "var(--panel2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: 13.5,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: reqState === "loading" ? "not-allowed" : "pointer",
                    marginTop: 16,
                    fontFamily: "inherit",
                    transition: "border-color 150ms ease, color 150ms ease",
                    opacity: reqState === "loading" ? 0.7 : 1,
                    minHeight: 44,
                  }}
                >
                  {reqState === "loading" ? (
                    <Spinner
                      borderColor="var(--muted)"
                      topColor="var(--text)"
                    />
                  ) : (
                    "Request access"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            Protected by magic-link auth ·{" "}
            <a href="#" style={{ color: "var(--blue)" }}>
              terms
            </a>
            {" · "}
            <a href="#" style={{ color: "var(--blue)" }}>
              privacy
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
