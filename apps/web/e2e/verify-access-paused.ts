/**
 * One-shot live verification for the Access Paused fix (see commit
 * 55be585). Creates a throwaway test user, allowlists them, confirms
 * normal access works, revokes their allowlist entry via the same
 * PostgREST service-role call this project's other scripts already use
 * for allowlist inserts, then confirms a protected route now redirects
 * to /access-paused with the real component rendered — not /login.
 *
 * Keeps the session token in-process only (never printed to stdout or
 * written to a file) — same reasoning as fix-readme-screenshots.ts.
 *
 *   node e2e/verify-access-paused.ts   (run from apps/web)
 */

import { chromium } from "@playwright/test";
import * as path from "path";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(
  import.meta.dirname,
  "../../..",
  "claude_docs",
  "ui-review",
  "before-after",
);

const EMAIL = "e2e-access-paused-verify@test.local";
const PASSWORD = "AccessPausedVerify!2026";

async function main(): Promise<void> {
  console.log("→ Allowlisting + creating test user…");
  await fetch(`${SUPABASE_URL}/rest/v1/invited_emails`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email: EMAIL }),
  });

  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    }),
  });

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const session = await res.json();
  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies([
    {
      name: "sb-localhost-auth-token",
      value: encoded,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();

  console.log("→ Confirming normal access works before revocation…");
  await page.goto(`${BASE_URL}/today`, { waitUntil: "networkidle" });
  const preUrl = page.url();
  console.log(`  landed on: ${preUrl}`);
  if (!preUrl.endsWith("/today")) {
    throw new Error(`expected /today before revocation, got ${preUrl}`);
  }

  console.log("→ Revoking allowlist entry…");
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/invited_emails?email=eq.${encodeURIComponent(
      EMAIL,
    )}`,
    {
      method: "DELETE",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!delRes.ok) throw new Error(`revoke failed: ${delRes.status}`);

  console.log("→ Re-navigating to a protected route as the now-revoked user…");
  await page.goto(`${BASE_URL}/today`, { waitUntil: "networkidle" });
  const postUrl = page.url();
  console.log(`  landed on: ${postUrl}`);

  const desktopPath = path.join(OUT_DIR, "access-paused-LIVE-desktop.png");
  await page.screenshot({ path: desktopPath, fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/access-paused`, { waitUntil: "networkidle" });
  const mobilePath = path.join(OUT_DIR, "access-paused-LIVE-mobile.png");
  await page.screenshot({ path: mobilePath, fullPage: false });

  const bodyText = await page.evaluate(() => document.body.innerText);

  await browser.close();

  console.log(`\n📸 ${desktopPath}`);
  console.log(`📸 ${mobilePath}`);

  if (postUrl.includes("/access-paused") && /paused/i.test(bodyText)) {
    console.log(
      "\n✅ PASS — revoked user was redirected to /access-paused and real content rendered.",
    );
  } else {
    console.log(
      "\n❌ FAIL — did not land on /access-paused with paused-state content.",
    );
    console.log(`   final URL: ${postUrl}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
