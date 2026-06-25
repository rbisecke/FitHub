# Skill: qa-run

Run an AI-driven QA pass over the FitHub app.

Uses the Playwright MCP (vision + devtools) to walk through sections of
`claude_docs/QA-Manual-Validation.md`, captures screenshots at every interaction,
measures latency via the browser Performance API, and generates a timestamped
report in `claude_docs/qa-reports/`.

## Prerequisites (must all be running)

```bash
supabase start
STUB_LLM=true uv run --project apps/api uvicorn app.main:app --app-dir apps/api --port 8000
pnpm --filter web dev
```

## Steps

### 1. Pre-flight check

- Open a Playwright browser session.
- Navigate to `http://localhost:3000` — confirm it loads without error.
- Navigate to `http://127.0.0.1:8000/health` — confirm JSON 200.
- If either fails, stop and tell the user what's not running.

### 2. Set up the e2e test user (auth-gated sections)

For any section that requires being logged in, seed the test user via the
Supabase admin API (same pattern as `apps/web/e2e/workout-tracker.spec.ts`):

- `E2E_EMAIL = "e2e-qa@test.local"`
- POST to `http://127.0.0.1:54321/rest/v1/invited_emails` (ignore-duplicates)
- POST to `http://127.0.0.1:54321/auth/v1/admin/users` with `email_confirm: true`
- Get a JWT via password grant and inject it as the Supabase session cookie

Do this once at the start of the session, not per-check.

### 3. Walk the QA checklist

Read `claude_docs/QA-Manual-Validation.md`. For every `[ ]` item in the
requested section(s):

**a) Navigate and interact**

Use the Playwright MCP tools:

- `browser_navigate` — go to the relevant URL
- `browser_snapshot` — read the accessibility tree before interacting
- `browser_fill_form` / `browser_click` / `browser_type` — perform the interaction
- `browser_wait_for` — wait for the expected result

**b) Measure latency for user-facing interactions**

For any interaction that has a visible UI response (button → state change,
form submit → redirect, click → dialog opens), measure timing via
`browser_evaluate`:

```javascript
// Run before the interaction
const t0 = performance.now();
// ... trigger interaction via Playwright ...
// Run after the condition is met
const t1 = performance.now();
return Math.round(t1 - t0); // ms
```

Compare against the thresholds in `apps/web/e2e/utils/measure.ts`.

**c) Take a screenshot and analyse it visually**

- Call `browser_take_screenshot`.
- With vision enabled, analyse the screenshot:
  - Is the content visible and correctly laid out?
  - Does spacing and hierarchy feel correct?
  - Is the git-theme consistent (dark background, monospace, zinc palette)?
  - Is the state change obvious to a user (e.g. success state, error state)?
  - Is there anything that would confuse or surprise a user?

**d) Check console and network**

- `browser_console_messages` — flag any errors or warnings.
- `browser_network_requests` — flag any requests that took > 500ms.

**e) Record the result**

- `[x]` = passed, no issues
- `[F]` = functional failure (check the Bugs table)
- `[x]⚠` = passed but with a latency warning or minor visual issue (note inline)

### 4. Generate the report

Create `claude_docs/qa-reports/YYYY-MM-DD-<section>.md` with this structure:

```markdown
# QA Report — <Section> — YYYY-MM-DD

## Summary

Pass: N | Fail: N | Latency warnings: N | Console errors: N

## Results

### <check description>

- Status: PASS / FAIL / LATENCY_WARNING
- Latency: Xms (threshold: Yms)
- Visual: <one sentence from vision analysis>
- Console: <errors if any, else "clean">
- Network: <slow requests if any, else "clean">
- Notes: <anything notable>
```

### 5. Update the QA doc

After all checks in the section are complete, update
`claude_docs/QA-Manual-Validation.md` with the results — mark items `[x]` or `[F]`,
add latency readings as inline notes, and add any new bugs to the Bugs table.

## Scope flags (optional)

The user can pass a section name to limit the run:

- `auth` — Section 1
- `dashboard` — Section 2
- `log` — Section 3
- `history` — Section 4
- `detail` — Section 5
- `analytics` — Section 6
- `coach` — Section 7
- `plans` — Section 8
- `adaptations` — Section 9
- `errors` — Section 10
- `security` — Section 11
- `team` — Section 12

No argument = all `[ ]` items across all sections.

## Latency thresholds (from `e2e/utils/measure.ts`)

| Interaction                             | Threshold |
| --------------------------------------- | --------- |
| TTFB                                    | 200ms     |
| Full page load                          | 1000ms    |
| Client state change (button → feedback) | 200ms     |
| Dialog open                             | 150ms     |
| Autocomplete result                     | 300ms     |
| API-backed response (stubbed)           | 1000ms    |
