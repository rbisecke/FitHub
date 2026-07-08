"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/page-header";
import { NotifyToggle } from "@/components/integrations/NotifyToggle";

type ConnectionStatus = {
  provider: string;
  sync_status: string;
  last_synced_at: string | null;
};

type ConnectResult = {
  token: string;
  token_prefix: string;
  ingest_url: string;
};

type FlowState =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | { kind: "connecting" }
  | {
      kind: "instructions";
      result: ConnectResult;
      tokenCopied: boolean;
      urlCopied: boolean;
    }
  | { kind: "connected"; status: ConnectionStatus; tokenPrefix: string }
  | { kind: "revoking" }
  | { kind: "confirm-revoke"; status: ConnectionStatus; tokenPrefix: string };

function CopyBlock({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex-1 min-w-0">
      <div
        className="font-mono text-[10px] uppercase tracking-[0.5px] mb-1"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>
      <div
        className="rounded-lg border p-3 flex items-center gap-2"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <span
          className="font-mono text-[11px] flex-1 break-all"
          style={{ color: "var(--text)" }}
        >
          {value}
        </span>
        <button
          onClick={copy}
          className="flex-shrink-0 transition-opacity hover:opacity-70"
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--accent)" }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--muted)" }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      {warn && (
        <p
          className="font-mono text-[10px] mt-1"
          style={{ color: "var(--amber)" }}
        >
          {warn}
        </p>
      )}
    </div>
  );
}

function AppleHealthLogo() {
  return (
    <div
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--surface)" }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--muted)" }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </div>
  );
}

const COMING_SOON = [
  { name: "Oura Ring", slug: "oura", sub: "HRV, sleep, readiness score" },
  { name: "Strava", slug: "strava", sub: "Activities, routes, pace data" },
  {
    name: "Garmin",
    slug: "garmin",
    sub: "Training load, body battery, stress",
  },
];

export default function IntegrationsPage() {
  const [flow, setFlow] = useState<FlowState>({ kind: "loading" });
  const [token, setToken] = useState<string>("");

  const loadStatus = useCallback(
    async (t: string) => {
      const connections = await api.integrations.list(t).catch(() => []);
      const ah = connections.find((c) => c.provider === "apple_health");
      if (ah?.last_synced_at) {
        const prefix =
          flow.kind === "connected"
            ? flow.tokenPrefix
            : flow.kind === "instructions"
              ? flow.result.token_prefix
              : "";
        setFlow({
          kind: "connected",
          status: ah,
          tokenPrefix: prefix,
        });
      } else {
        setFlow({ kind: "disconnected" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createClient();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (cancelled || !session) return;
      const t = session.access_token;
      setToken(t);
      await loadStatus(t);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  async function handleConnect() {
    setFlow({ kind: "connecting" });
    try {
      const result = await api.integrations.connectAppleHealth(token);
      setFlow({
        kind: "instructions",
        result,
        tokenCopied: false,
        urlCopied: false,
      });
    } catch {
      setFlow({ kind: "disconnected" });
    }
  }

  async function handleRevoke() {
    if (flow.kind !== "confirm-revoke") return;
    setFlow({ kind: "revoking" });
    await api.integrations.revokeAppleHealth(token).catch(() => undefined);
    setFlow({ kind: "disconnected" });
  }

  if (flow.kind === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader gitCommand="$ git remote -v" title="Integrations" />
        <p className="font-mono text-sm" style={{ color: "var(--muted)" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <PageHeader
        gitCommand="$ git remote -v"
        title="Integrations"
        sub="Connect wearables and apps to improve readiness scoring."
      />

      {/* Apple Health card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-start gap-4">
          <AppleHealthLogo />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2
                className="font-mono text-[14px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                Apple Health
              </h2>
              {(flow.kind === "connected" ||
                flow.kind === "confirm-revoke") && (
                <span
                  className="rounded border px-1.5 py-0.5 font-mono text-[10px]"
                  style={{
                    background: "rgba(63,185,80,0.12)",
                    color: "var(--green)",
                    borderColor: "rgba(63,185,80,0.3)",
                  }}
                >
                  Connected
                </span>
              )}
            </div>
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              HRV, resting heart rate, sleep quality · via Health Auto Export
            </p>
          </div>
        </div>

        {/* Disconnected */}
        {(flow.kind === "disconnected" || flow.kind === "connecting") && (
          <button
            onClick={handleConnect}
            disabled={flow.kind === "connecting"}
            className="rounded-lg px-4 py-2 font-mono text-[13px] font-semibold transition-opacity disabled:opacity-50 hover:opacity-80"
            style={{
              background: "var(--accent)",
              color: "#0d1117",
            }}
          >
            {flow.kind === "connecting" ? "Connecting…" : "Connect"}
          </button>
        )}

        {/* Instructions (shown once after connect) */}
        {flow.kind === "instructions" && (
          <div className="space-y-4">
            <div
              className="rounded-lg border p-4 space-y-3"
              style={{
                background: "var(--bg)",
                borderColor: "var(--border)",
              }}
            >
              <div>
                <p
                  className="font-mono text-[11px] font-semibold mb-1"
                  style={{ color: "var(--text)" }}
                >
                  Step 1
                </p>
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                  Install{" "}
                  <a
                    href="https://apps.apple.com/app/health-auto-export-json-csv/id1115567069"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                    style={{ color: "var(--blue)" }}
                  >
                    Health Auto Export
                  </a>{" "}
                  from the App Store on your iPhone.
                </p>
              </div>
              <div>
                <p
                  className="font-mono text-[11px] font-semibold mb-1"
                  style={{ color: "var(--text)" }}
                >
                  Step 2
                </p>
                <p
                  className="text-[12px] mb-3"
                  style={{ color: "var(--muted)" }}
                >
                  In HAE: Settings → Exports → + → REST API, then paste these:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <CopyBlock
                    label="Endpoint URL"
                    value={flow.result.ingest_url}
                  />
                  <CopyBlock
                    label="Bearer token"
                    value={flow.result.token}
                    warn="Shown once — copy now"
                  />
                </div>
              </div>
            </div>
            <p
              className="font-mono text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              Tap &ldquo;Export Now&rdquo; in HAE to verify the connection.
            </p>
          </div>
        )}

        {/* Connected state */}
        {(flow.kind === "connected" || flow.kind === "confirm-revoke") && (
          <div className="space-y-3">
            {flow.status.last_synced_at && (
              <p
                className="font-mono text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                Last sync:{" "}
                <span style={{ color: "var(--text)" }}>
                  {flow.status.last_synced_at}
                </span>
              </p>
            )}
            {flow.tokenPrefix && (
              <p
                className="font-mono text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                Token:{" "}
                <span style={{ color: "var(--text)" }}>
                  {flow.tokenPrefix}…
                </span>
              </p>
            )}
            <div className="space-y-1.5">
              {[
                "HRV SDNN",
                "Resting HR",
                "Sleep",
                "VO2 max",
                "Active energy",
              ].map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "var(--green)", flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {m}
                  </span>
                </div>
              ))}
            </div>

            {/* Revoke inline confirm */}
            {flow.kind === "connected" && (
              <button
                onClick={() =>
                  setFlow({
                    kind: "confirm-revoke",
                    status: flow.status,
                    tokenPrefix: flow.tokenPrefix,
                  })
                }
                className="font-mono text-[11px] underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: "var(--red)" }}
              >
                Revoke
              </button>
            )}
            {flow.kind === "confirm-revoke" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRevoke}
                  className="font-mono text-[11px] font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--red)" }}
                >
                  Confirm revoke
                </button>
                <button
                  onClick={() =>
                    setFlow({
                      kind: "connected",
                      status: flow.status,
                      tokenPrefix: flow.tokenPrefix,
                    })
                  }
                  className="font-mono text-[11px] underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--muted)" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Revoking */}
        {flow.kind === "revoking" && (
          <p
            className="font-mono text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Revoking…
          </p>
        )}
      </div>

      {/* Coming soon section */}
      <div>
        <p
          className="font-mono text-[10px] uppercase tracking-[0.5px] mb-3"
          style={{ color: "var(--muted)" }}
        >
          Coming soon
        </p>
        <div className="space-y-2">
          {COMING_SOON.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border px-4 py-3 flex items-center justify-between"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div>
                <p
                  className="font-mono text-[13px] font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {item.name}
                </p>
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {item.sub}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="rounded border px-1.5 py-0.5 font-mono text-[10px]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  soon
                </span>
                <NotifyToggle slug={item.slug} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
