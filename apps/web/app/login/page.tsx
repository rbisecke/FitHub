"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // New-user creation is gated by the before_user_created_hook in Supabase
        // (checks public.invited_emails). shouldCreateUser must be true so the hook
        // runs; with it false, Supabase silently skips the email for unknown addresses.
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      // Use a single message regardless of the error type — distinguishing
      // "not invited" from other errors would let callers enumerate the invite list.
      setErrorMsg(
        "If that email is on our invite list, you'll receive a magic link.",
      );
    } else {
      setStatus("sent");
    }
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(600px 400px at 50% 40%, rgba(88,166,255,0.08), #09090b 70%)",
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark */}
        <div className="space-y-1 text-center">
          <p className="font-mono text-sm text-zinc-500">$ git commit --fit</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
            FitHub
          </h1>
          <p className="text-sm text-zinc-400">
            Training history for people who think in commits.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border border-zinc-600 bg-zinc-900 px-6 py-8 text-center space-y-3">
            <p className="text-2xl">✓</p>
            <p className="text-zinc-50 font-medium">Check your email</p>
            <p className="text-sm text-zinc-400">
              Magic link sent to{" "}
              <span className="font-mono text-zinc-200">{email}</span>
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-2 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-8"
          >
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {status === "loading" ? "Sending…" : "Send magic link"}
            </button>

            <p className="text-center text-xs text-zinc-600">
              Access by invitation only · Ask your host for an invite
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
