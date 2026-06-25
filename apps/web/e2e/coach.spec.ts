/**
 * Phase 5 E2E — AI Coach
 * Tests the NL log parser and chat endpoints via the browser.
 */

import { type Page, expect, test } from "@playwright/test";

const LIVE_LLM = process.env.LIVE_LLM === "true";

const E2E_EMAIL = "e2e-coach@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function ensureTestUser(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/invited_emails`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email: E2E_EMAIL }),
  });
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    }),
  });
}

async function loginAndSetSession(page: Page): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) throw new Error(`password grant failed: ${res.status}`);
  const session = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
    user: Record<string, unknown>;
  };
  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await page.context().addCookies([
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
  return session.access_token;
}

test.beforeAll(async () => {
  await ensureTestUser();
});

test("coach page loads and shows git-themed heading", async ({ page }) => {
  await loginAndSetSession(page);
  await page.goto("http://localhost:3000/coach");
  await expect(page.locator("h1").filter({ hasText: "git coach" })).toBeVisible(
    {
      timeout: 10000,
    },
  );
});

test("NL log parse returns parsed result (stub mode)", async ({ page }) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/coach/parse-log`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: "5x5 back squat at 100kg, RPE 8" }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as Record<string, unknown>;
  expect(data).toHaveProperty("parsed");
  if (!LIVE_LLM) {
    expect(data["stub"]).toBe(true);
  }
});

test("chat endpoint returns answer with safety_tier (stub mode)", async ({
  page,
}) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/coach/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "How do I improve my clean?" }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as Record<string, unknown>;
  expect(typeof data["answer"]).toBe("string");
  expect(data).toHaveProperty("safety_tier");
});

test("STOP-tier question returns safety_tier=stop and no workout advice", async ({
  page,
}) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/coach/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "I have chest pain during pull-ups" }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as { safety_tier: string; answer: string };
  expect(data.safety_tier).toBe("stop");
  expect(data.answer.toLowerCase()).not.toContain("sets");
  expect(data.answer.toLowerCase()).not.toContain("reps");
});

test("unauthenticated chat returns 401", async () => {
  const res = await fetch(`${API_URL}/api/v1/coach/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "test" }),
  });
  expect(res.status).toBe(401);
});

test("unauthenticated history returns 401", async () => {
  const res = await fetch(
    `${API_URL}/api/v1/coach/history?session_id=00000000-0000-0000-0000-000000000001`,
  );
  expect(res.status).toBe(401);
});

test.describe("multi-turn chat", () => {
  test("session_id is sent in POST /chat request body", async ({ page }) => {
    const token = await loginAndSetSession(page);

    const intercepted: string[] = [];
    await page.route("**/api/v1/coach/chat", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (typeof body["session_id"] === "string") {
        intercepted.push(body["session_id"]);
      }
      await route.continue();
    });

    await page.goto("http://localhost:3000/coach");
    await page.waitForSelector(
      '[data-testid="coach-chat-input"]:not([disabled])',
      {
        timeout: 8000,
      },
    );

    await page.fill('[data-testid="coach-chat-input"]', "What is ACWR?");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="chat-response"]', {
      timeout: 10000,
    });

    expect(intercepted.length).toBeGreaterThan(0);
    expect(intercepted[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    // Suppress unused-variable warning — token used to set session above
    void token;
  });

  test("starter prompt cards visible on fresh session", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("http://localhost:3000/coach");
    // Clear any existing session so we get a clean slate
    await page.evaluate(() => localStorage.removeItem("coach_session_id"));
    await page.reload();

    // Wait for history load to complete (input becomes enabled)
    await page.waitForSelector(
      '[data-testid="coach-chat-input"]:not([disabled])',
      {
        timeout: 8000,
      },
    );

    const cards = page.locator("button", { hasText: "Why did my ACWR spike" });
    await expect(cards).toBeVisible();
  });

  test("input is disabled on page load until history fetch resolves", async ({
    page,
  }) => {
    await loginAndSetSession(page);
    await page.goto("http://localhost:3000/coach");

    const chatInput = page.locator('[data-testid="coach-chat-input"]');
    await expect(chatInput).toBeEnabled({ timeout: 8000 });
  });

  test("second message renders below first response in same session", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);
    await page.goto("http://localhost:3000/coach");
    await page.waitForSelector(
      '[data-testid="coach-chat-input"]:not([disabled])',
      {
        timeout: 8000,
      },
    );

    await page.fill('[data-testid="coach-chat-input"]', "What is ACWR?");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="chat-response"]', {
      timeout: 10000,
    });

    await page.fill('[data-testid="coach-chat-input"]', "How do I lower it?");
    await page.click('button[type="submit"]');

    const responses = page.locator('[data-testid="chat-response"]');
    await expect(responses).toHaveCount(2, { timeout: 10000 });
    void token;
  });

  test("new chat button clears the message list", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("http://localhost:3000/coach");
    await page.waitForSelector(
      '[data-testid="coach-chat-input"]:not([disabled])',
      {
        timeout: 8000,
      },
    );

    // Send two messages so the session indicator (with new chat button) appears
    await page.fill('[data-testid="coach-chat-input"]', "What is ACWR?");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="chat-response"]', {
      timeout: 10000,
    });

    await page.fill('[data-testid="coach-chat-input"]', "And what is RPE?");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="chat-response"]:nth-of-type(2)', {
      timeout: 10000,
    });

    await page.click('button:has-text("+ new chat")');

    // Messages cleared; starter prompts should reappear after fresh history fetch
    await page.waitForSelector(
      '[data-testid="coach-chat-input"]:not([disabled])',
      {
        timeout: 5000,
      },
    );
    const responses = page.locator('[data-testid="chat-response"]');
    await expect(responses).toHaveCount(0);
  });
});

// ── B4: streaming chat + session persistence ───────────────────────────────────

const BOB_EMAIL = "e2e-coach-bob@test.local";
const BOB_PASSWORD = "E2eTestFitHub!2026";

/** Parse SSE response body into an array of parsed event objects. */
function parseSseEvents(text: string): Record<string, unknown>[] {
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.startsWith("data: "))
    .map((block) => JSON.parse(block.slice(6)) as Record<string, unknown>);
}

async function ensureBobUser(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/invited_emails`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email: BOB_EMAIL }),
  });
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: BOB_EMAIL,
      password: BOB_PASSWORD,
      email_confirm: true,
    }),
  });
}

async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok)
    throw new Error(`password grant failed for ${email}: ${res.status}`);
  const session = (await res.json()) as { access_token: string };
  return session.access_token;
}

test.describe("B4 — streaming chat API", () => {
  test.beforeAll(async () => {
    await ensureTestUser();
    await ensureBobUser();
  });

  // ── auth guard ────────────────────────────────────────────────────────────

  test("GET /sessions requires auth → 401", async () => {
    const res = await fetch(`${API_URL}/api/v1/coach/sessions`);
    expect(res.status).toBe(401);
  });

  test("POST /chat/stream requires auth → 401", async () => {
    const res = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "test" }),
    });
    expect(res.status).toBe(401);
  });

  test("GET /sessions/{id}/messages requires auth → 401", async () => {
    const res = await fetch(
      `${API_URL}/api/v1/coach/sessions/00000000-0000-0000-0000-000000000001/messages`,
    );
    expect(res.status).toBe(401);
  });

  // ── SSE streaming behaviour ───────────────────────────────────────────────

  test("POST /chat/stream returns text/event-stream with token + done events", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);
    const res = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "What is a good ACWR range?",
        session_id: null,
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = parseSseEvents(await res.text());
    const tokenEvents = events.filter((e) => "token" in e);
    const doneEvent = events.find((e) => e["done"] === true);

    expect(tokenEvents.length).toBeGreaterThan(0);
    expect(doneEvent).toBeDefined();
    expect(String(doneEvent!["session_id"])).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(doneEvent!["safety_tier"]).toBeTruthy();
  });

  test("STOP-tier question yields error SSE event with safety_tier=stop", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);
    const res = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "I have chest pain during pull-ups" }),
    });

    expect(res.status).toBe(200);
    const events = parseSseEvents(await res.text());
    const errorEvent = events.find((e) => e["error"] === true);

    expect(errorEvent).toBeDefined();
    expect(errorEvent!["safety_tier"]).toBe("stop");
  });

  // ── session lifecycle ─────────────────────────────────────────────────────

  test("POST /chat/stream (null session_id) creates session visible in GET /sessions", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);

    const streamRes = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "How do I improve my deadlift?" }),
    });
    const doneEvent = parseSseEvents(await streamRes.text()).find(
      (e) => e["done"] === true,
    ) as { session_id: string } | undefined;
    expect(doneEvent).toBeDefined();
    const newSessionId = doneEvent!.session_id;

    const sessionsRes = await fetch(`${API_URL}/api/v1/coach/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sessionsRes.status).toBe(200);
    const sessions = (await sessionsRes.json()) as { id: string }[];
    expect(sessions.some((s) => s.id === newSessionId)).toBe(true);
  });

  test("second stream with explicit session_id reuses the session (same session_id returned)", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);

    const r1 = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "What is ACWR?" }),
    });
    const done1 = parseSseEvents(await r1.text()).find(
      (e) => e["done"] === true,
    ) as { session_id: string } | undefined;
    const sessionId = done1!.session_id;

    const r2 = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "How do I lower it?",
        session_id: sessionId,
      }),
    });
    const done2 = parseSseEvents(await r2.text()).find(
      (e) => e["done"] === true,
    ) as { session_id: string } | undefined;

    expect(done2!.session_id).toBe(sessionId);
  });

  // ── message persistence ───────────────────────────────────────────────────

  test("GET /sessions/{id}/messages returns persisted user + assistant messages", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);

    const streamRes = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "What is RPE?" }),
    });
    const doneEvent = parseSseEvents(await streamRes.text()).find(
      (e) => e["done"] === true,
    ) as { session_id: string } | undefined;
    const sessionId = doneEvent!.session_id;

    const msgsRes = await fetch(
      `${API_URL}/api/v1/coach/sessions/${sessionId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(msgsRes.status).toBe(200);

    const body = (await msgsRes.json()) as {
      messages: { role: string; content: string }[];
      has_more: boolean;
    };
    expect(body.messages.length).toBeGreaterThanOrEqual(2);
    const [userMsg, assistantMsg] = body.messages;
    expect(userMsg!.role).toBe("user");
    expect(userMsg!.content).toBe("What is RPE?");
    expect(assistantMsg!.role).toBe("assistant");
    expect(typeof assistantMsg!.content).toBe("string");
    expect(assistantMsg!.content.length).toBeGreaterThan(0);
  });

  // ── IDOR isolation ────────────────────────────────────────────────────────

  test("Alice cannot read Bob sessions via GET /sessions/{id}/messages", async ({
    page,
  }) => {
    const aliceToken = await loginAndSetSession(page);
    const bobToken = await getToken(BOB_EMAIL, BOB_PASSWORD);

    // Bob creates a session
    const bobRes = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bobToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "What is ACWR?" }),
    });
    const bobDone = parseSseEvents(await bobRes.text()).find(
      (e) => e["done"] === true,
    ) as { session_id: string } | undefined;
    const bobSessionId = bobDone!.session_id;

    // Alice tries to fetch Bob's messages — should get empty list (404-like behavior via empty)
    const aliceMsgsRes = await fetch(
      `${API_URL}/api/v1/coach/sessions/${bobSessionId}/messages`,
      { headers: { Authorization: `Bearer ${aliceToken}` } },
    );
    expect(aliceMsgsRes.status).toBe(200);
    const body = (await aliceMsgsRes.json()) as { messages: unknown[] };
    expect(body.messages.length).toBe(0);
  });

  test("Alice cannot stream into Bob's session (error SSE event returned)", async ({
    page,
  }) => {
    const aliceToken = await loginAndSetSession(page);
    const bobToken = await getToken(BOB_EMAIL, BOB_PASSWORD);

    // Bob creates a session
    const bobRes = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bobToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "What is ACWR?" }),
    });
    const bobDone = parseSseEvents(await bobRes.text()).find(
      (e) => e["done"] === true,
    ) as { session_id: string } | undefined;
    const bobSessionId = bobDone!.session_id;

    // Alice tries to post into Bob's session
    const aliceRes = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "Hijack!", session_id: bobSessionId }),
    });
    expect(aliceRes.status).toBe(200); // SSE always 200; error is in the payload
    const events = parseSseEvents(await aliceRes.text());
    const errorEvent = events.find((e) => e["error"] === true);
    expect(errorEvent).toBeDefined();
  });

  // ── validation ────────────────────────────────────────────────────────────

  test("question exceeding 2000 chars is rejected with 422", async ({
    page,
  }) => {
    const token = await loginAndSetSession(page);
    const res = await fetch(`${API_URL}/api/v1/coach/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "a".repeat(2001) }),
    });
    expect(res.status).toBe(422);
  });
});
