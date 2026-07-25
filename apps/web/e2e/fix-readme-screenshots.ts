/**
 * Targeted re-capture for 3 curated README screenshots that came out of the
 * full redesign campaign in a visibly dev-artifact state:
 *   - coach-chat.png: showed the literal STUB_LLM disclaimer text
 *   - plan-detail.png: showed a visible "STUB" badge on the adaptation card
 *   - admin-users.png: dominated by leftover e2e-test-fixture rows
 *
 * Reuses the same login pattern as take-redesign-screenshots.ts (password
 * grant -> context.addCookies()) but keeps the token in-process only, never
 * printed to stdout or written to a file — this script's whole reason to
 * exist is avoiding that.
 *
 * Run against the temporary admin-enabled API on :8001 / web on :3002 set up
 * for this fix (see chat history) — NEXT_PUBLIC_API_URL=http://localhost:8001
 * is baked into that web process already, so this script only talks to
 * localhost:3002 for pages and :54321/:8001 for auth/seeding.
 *
 *   node e2e/fix-readme-screenshots.ts   (run from apps/web — Node 22+ strips
 *                                         TypeScript types natively, no
 *                                         ts-node/tsx needed)
 */

import { chromium } from "@playwright/test";
import * as path from "path";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const API_URL = "http://localhost:8001";
const BASE_URL = "http://localhost:3002";
const README_DIR = path.join(
  import.meta.dirname,
  "../../..",
  "screenshots",
  "readme",
);

const EMAIL = "alex.rivera@fithub.local";
const PASSWORD = "DemoFitHub!2026";

async function main(): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const session = await res.json();
  const token: string = session.access_token;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
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

  // ── 1. Coach — empty composer state, no message sent, so the STUB_LLM
  //      disclaimer text never appears. Still shows the real chat UI.
  await page.goto(`${BASE_URL}/coach`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(README_DIR, "coach-chat.png"),
    fullPage: false,
  });
  console.log("  📸 coach-chat.png (empty composer, no stub text)");

  // ── 2. Plan detail — the existing seeded plan has a STUB-labeled pending
  //      adaptation baked in (dismiss/apply both leave the STUB badge and/or
  //      add an "already resolved" error line, since the badge reflects the
  //      adaptation record's own data, not a dismissable UI state). Create a
  //      fresh second plan instead, which has no adaptation yet, for a clean
  //      shot — a real product flow (generating a plan), not fabricated data.
  const start = new Date(Date.now() - 3 * 86400 * 1000);
  const startDate = `${start.getFullYear()}-${String(
    start.getMonth() + 1,
  ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const createRes = await fetch(`${API_URL}/api/v1/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      archetype: "general-crossfit",
      title: "Hybrid Strength & Conditioning — 8 Weeks",
      start_date: startDate,
      weeks: 8,
      training_age: "intermediate",
      equipment: ["barbell", "pull-up bar", "kettlebell"],
      days_per_week: 5,
    }),
  });
  let planId: string | null = null;
  if (createRes.ok) {
    const task = (await createRes.json()) as { task_id: string };
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(
        `${API_URL}/api/v1/plans/tasks/${task.task_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!pollRes.ok) continue;
      const poll = (await pollRes.json()) as {
        status: string;
        plan_id?: string;
      };
      if (poll.status === "complete" && poll.plan_id) {
        planId = poll.plan_id;
        break;
      }
      if (poll.status === "failed") break;
    }
  }

  if (planId) {
    await page.goto(`${BASE_URL}/plan/${planId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(README_DIR, "plan-detail.png"),
      fullPage: false,
    });
    console.log("  📸 plan-detail.png (fresh plan, no adaptation record)");
  } else {
    console.warn(
      "  ⚠ fresh plan generation failed — plan-detail.png left as-is",
    );
  }

  // ── 3. Admin users — use the real search field to filter down to the
  //      intentional demo accounts, rather than showing raw e2e-test noise.
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const search = page.getByPlaceholder(/search by name or email/i);
  if (await search.isVisible().catch(() => false)) {
    await search.fill("fithub.local");
    await page.waitForTimeout(400);
  }
  await page.screenshot({
    path: path.join(README_DIR, "admin-users.png"),
    fullPage: false,
  });
  console.log("  📸 admin-users.png (filtered to demo accounts)");

  await browser.close();
  console.log("\n✅ Fixed 3 README screenshots.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
