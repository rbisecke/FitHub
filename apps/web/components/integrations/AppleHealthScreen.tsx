"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Battery,
  Check,
  Copy as CopyIcon,
  Droplet,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  Moon,
  TriangleAlert,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import type { ConnectResponse, IntegrationDetail } from "@/lib/api";
import { relativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/team-sessions/detail/ConfirmSheet";
import { deriveState, STATE_META } from "./integrationStatus";

/**
 * Apple Health connect flow (07 §B) + source detail (07 §C). Internal
 * `screen` state carries the client-side lifecycle rather than separate
 * routes — see the page's doc comment for why.
 */

type Screen = "load_failed" | "not_connected" | "instructions" | "detail";

const METRICS: {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    key: "hrv_sdnn",
    label: "Heart rate variability (SDNN)",
    icon: Heart,
    color: "var(--red)",
  },
  {
    key: "rhr",
    label: "Resting heart rate",
    icon: HeartPulse,
    color: "var(--purple)",
  },
  {
    key: "respiratory_rate",
    label: "Respiratory rate",
    icon: Wind,
    color: "var(--teal)",
  },
  {
    key: "spo2",
    label: "Blood oxygen (SpO2)",
    icon: Droplet,
    color: "var(--accent)",
  },
  { key: "vo2max", label: "VO2 max", icon: Gauge, color: "var(--green)" },
  {
    key: "active_energy_kcal",
    label: "Active energy",
    icon: Zap,
    color: "var(--amber)",
  },
  {
    key: "resting_energy_kcal",
    label: "Resting energy",
    icon: Battery,
    color: "var(--muted-strong)",
  },
  { key: "steps", label: "Steps", icon: Footprints, color: "var(--green)" },
  {
    key: "sleep_score",
    label: "Sleep score",
    icon: Moon,
    color: "var(--purple)",
  },
];

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context) — silently ignore, same as
      // the Load Calculator's copy button.
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-sans text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={
            copied
              ? `Copied ${label.toLowerCase()}`
              : `Copy ${label.toLowerCase()}`
          }
          className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 font-sans text-[12px] font-semibold text-[var(--accent)]"
        >
          {copied ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <CopyIcon size={14} aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code
        className="block overflow-x-auto rounded-md border p-3 font-mono text-[12px] break-all"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
        }}
      >
        {value}
      </code>
    </div>
  );
}

function RateLimitBanner() {
  return (
    <p
      className="rounded-md border p-3 font-sans text-[13px]"
      style={{ borderColor: "var(--amber)", color: "var(--amber)" }}
    >
      Too many connection attempts — try again in a bit.
    </p>
  );
}

function ActionErrorBanner({ message }: { message: string }) {
  return (
    <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
      {message}
    </p>
  );
}

export function AppleHealthScreen({
  token,
  initialDetail,
  initialLoadFailed,
}: {
  token: string;
  initialDetail: IntegrationDetail | null;
  initialLoadFailed: boolean;
}) {
  const [screen, setScreen] = useState<Screen>(
    initialLoadFailed
      ? "load_failed"
      : initialDetail
        ? "detail"
        : "not_connected",
  );
  const [detail, setDetail] = useState<IntegrationDetail | null>(initialDetail);
  const [justMinted, setJustMinted] = useState<ConnectResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
  const [retryingLoad, setRetryingLoad] = useState(false);

  /** Returns whether the mint succeeded, so callers (e.g. the regenerate
   * confirm sheet) can decide whether to dismiss themselves — on failure the
   * sheet should stay open with the error/rate-limit banner visible inside
   * it, not close and leave the user looking at the plain detail screen
   * wondering whether anything happened. */
  async function handleMint(): Promise<boolean> {
    setPending(true);
    setActionError(null);
    setRateLimited(false);
    try {
      const res = await api.integrations.connectAppleHealth(token);
      setJustMinted(res);
      setScreen("instructions");
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRateLimited(true);
      } else {
        setActionError("Something went wrong. Please try again.");
      }
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleGotIt() {
    setPending(true);
    try {
      const fresh = await api.integrations.appleHealthDetail(token);
      setDetail(fresh);
    } catch {
      // The mint just succeeded, so we know enough to render the detail
      // screen without a fresh fetch — a later visit reconciles the rest.
      if (justMinted) {
        setDetail({
          provider: "apple_health",
          sync_status: "idle",
          last_synced_at: null,
          token_prefix: justMinted.token_prefix,
          last_sync_rows_inserted: null,
          last_sync_recovery_computed: null,
          last_sync_error: null,
        });
      }
    } finally {
      setJustMinted(null);
      setScreen("detail");
      setPending(false);
    }
  }

  async function handleRetryLoad() {
    setRetryingLoad(true);
    try {
      const fresh = await api.integrations.appleHealthDetail(token);
      setDetail(fresh);
      setScreen("detail");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setScreen("not_connected");
      }
      // else: stay on load_failed — the retry button remains available.
    } finally {
      setRetryingLoad(false);
    }
  }

  // ── Load failed (initial server fetch hit a non-404 error) ─────────────────
  if (screen === "load_failed") {
    return (
      <div className="pb-nav-safe-fab mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
        <BackLink />
        <p className="type-small text-destructive">
          Couldn&apos;t load this connection. Please try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => void handleRetryLoad()}
          disabled={retryingLoad}
        >
          {retryingLoad ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }

  // ── Not connected — the connect entry point (07 §B) ─────────────────────────
  if (screen === "not_connected") {
    return (
      <div className="pb-nav-safe-fab mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
        <BackLink />
        <div>
          <h1 className="type-h2 text-foreground">Apple Health</h1>
          <p className="type-small text-muted-foreground">
            Connect via Health Auto Export — a bearer token, like a git personal
            access token, that you paste into a third-party app, not an OAuth
            sign-in.
          </p>
        </div>
        <p className="font-sans text-[13px]" style={{ color: "var(--text)" }}>
          FitHub reads heart rate variability, resting heart rate, sleep, and
          more from Apple Health through the Health Auto Export (HAE) app.
          Connecting mints a bearer token you paste into HAE&apos;s own
          automation settings — there&apos;s no app-to-app sign-in step.
        </p>
        {rateLimited && <RateLimitBanner />}
        {actionError && <ActionErrorBanner message={actionError} />}
        <Button
          className="w-fit"
          onClick={() => void handleMint()}
          disabled={pending}
        >
          {pending ? "Minting your token…" : "Connect Apple Health"}
        </Button>
      </div>
    );
  }

  // ── Instructions — token shown once (07 §B) ─────────────────────────────────
  if (screen === "instructions" && justMinted) {
    return (
      <div className="pb-nav-safe-fab mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
        <div
          className="flex items-start gap-2 rounded-lg border p-3"
          style={{
            borderColor: "var(--amber)",
            background: "color-mix(in oklab, var(--amber) 12%, var(--bg))",
          }}
        >
          <TriangleAlert
            size={16}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--amber)" }}
            aria-hidden="true"
          />
          <p
            className="font-sans text-[13px] font-medium"
            style={{ color: "var(--text)" }}
          >
            Shown once — copy it now. This token won&apos;t be shown again after
            you leave this screen.
          </p>
        </div>

        <div
          className="flex flex-col gap-4 rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <CopyBlock label="Bearer token" value={justMinted.token} />
          <CopyBlock label="Ingest URL" value={justMinted.ingest_url} />

          <ol
            className="list-decimal space-y-1 pl-5 font-sans text-[13px]"
            style={{ color: "var(--text)" }}
          >
            <li>
              Open Health Auto Export → Automations → new REST API export.
            </li>
            <li>Paste the ingest URL above as the destination.</li>
            <li>
              Paste the token above as the{" "}
              <code className="font-mono text-[12px]">Authorization</code>{" "}
              bearer header.
            </li>
          </ol>

          <p
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            We&apos;ll flip this to Connected once your first sync arrives —
            there&apos;s no live handshake to wait for.
          </p>
        </div>

        <Button
          className="w-fit"
          onClick={() => void handleGotIt()}
          disabled={pending}
        >
          Got it
        </Button>
      </div>
    );
  }

  // ── Detail — already connected (07 §C) ──────────────────────────────────────
  if (screen === "detail" && detail) {
    const state = deriveState(detail);
    const meta = STATE_META[state];

    return (
      <div className="pb-nav-safe-fab mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <BackLink />

        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--surface)", color: "var(--text)" }}
            aria-hidden="true"
          >
            <HeartPulse size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="type-h2 text-foreground">Apple Health</h1>
          </div>
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
            style={{
              color: meta.color,
              borderColor: `color-mix(in oklab, ${meta.color} 50%, transparent)`,
              background: "var(--bg)",
            }}
          >
            {meta.label}
          </span>
        </div>

        <section
          className="flex flex-col gap-1 rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            background:
              state === "error"
                ? "color-mix(in oklab, var(--red) 8%, var(--bg))"
                : "var(--bg)",
          }}
        >
          {detail.last_synced_at == null ? (
            // A never-synced connection with a recorded error means a sync
            // was attempted and failed — "Awaiting first sync" would read as
            // a contradiction next to the error line below, so it's skipped
            // and the error message alone explains the state.
            detail.last_sync_error == null && (
              <p
                className="font-sans text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                Awaiting first sync.
              </p>
            )
          ) : (
            <p
              className="font-mono text-[13px] tabular-nums"
              style={{ color: "var(--text)" }}
            >
              Synced {relativeTime(detail.last_synced_at)}
              {detail.last_sync_rows_inserted != null && (
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  · {detail.last_sync_rows_inserted} metrics written
                </span>
              )}
            </p>
          )}
          {detail.last_sync_recovery_computed === false && (
            <p
              className="font-sans text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              Metrics saved; recovery score will catch up on the next sync.
            </p>
          )}
          {detail.last_sync_error && (
            <p
              className="font-sans text-[12px]"
              style={{ color: "var(--red)" }}
            >
              {detail.last_sync_error === "payload_too_large"
                ? "Your last sync's payload was too large — check how much history Health Auto Export is sending at once."
                : "Your last sync sent data FitHub couldn't read — this is usually a temporary Health Auto Export hiccup."}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-[12px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            What this source writes
          </h2>
          <ul className="flex flex-col gap-1 sm:gap-2">
            {METRICS.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.key} className="flex items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center"
                    style={{ color: m.color }}
                    aria-hidden="true"
                  >
                    <Icon size={16} />
                  </span>
                  <span
                    className="font-sans text-[13px]"
                    style={{ color: "var(--text)" }}
                  >
                    {m.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <p
            className="mt-2 font-sans text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            Metrics not listed here are ignored.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-[12px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            Token reference
          </h2>
          <code
            className="w-fit rounded-md border px-3 py-2 font-mono text-[12px]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            {detail.token_prefix ?? "—"}••••••••
          </code>
          {rateLimited && <RateLimitBanner />}
          {actionError && <ActionErrorBanner message={actionError} />}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRegenerateOpen(true)}
              disabled={pending}
            >
              Regenerate token
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmRevokeOpen(true)}
              disabled={pending}
            >
              Disconnect
            </Button>
          </div>
        </section>

        {confirmRegenerateOpen && (
          <ConfirmSheet
            title="Regenerate token?"
            body="This immediately invalidates the current token. Your Health Auto Export config will stop working until you paste the new token and URL back into HAE."
            confirmLabel="Regenerate"
            onClose={() => setConfirmRegenerateOpen(false)}
            onConfirm={async () => {
              await handleMint();
              setConfirmRegenerateOpen(false);
            }}
          />
        )}

        {confirmRevokeOpen && (
          <ConfirmSheet
            title="Disconnect Apple Health?"
            body="This deletes the connection and its token. Your HAE export will stop working. Already-synced metrics stay in your history."
            confirmLabel="Disconnect"
            destructive
            onClose={() => setConfirmRevokeOpen(false)}
            onConfirm={async () => {
              await api.integrations.revokeAppleHealth(token);
              setDetail(null);
              setJustMinted(null);
              setScreen("not_connected");
              setConfirmRevokeOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  return null;
}

function BackLink() {
  return (
    <Link
      href="/integrations"
      className="flex w-fit items-center gap-1 font-sans text-[13px] text-[var(--accent)]"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Integrations
    </Link>
  );
}
