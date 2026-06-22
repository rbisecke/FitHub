# Security Policy

## Supported Versions

Only the current deployment (tracking `main`) is supported. There are no versioned releases with independent security support windows.

| Version           | Supported |
| ----------------- | --------- |
| `main` (latest)   | ✅        |
| All prior commits | ❌        |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting feature:

1. Go to the [Security tab](https://github.com/rbisecke/FitHub/security) of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the details — what you found, how to reproduce it, and the potential impact.

I will acknowledge the report within **72 hours** and aim to release a fix within **14 days** for confirmed vulnerabilities.

## Scope

The following are in scope for security reports:

- **Authentication & authorisation**: JWT handling, session management, invite-only enforcement
- **Data isolation**: Cross-user data access (IDOR), RLS bypass
- **Injection**: SQL injection, prompt injection in AI endpoints
- **API security**: Rate limiting bypass, unauthenticated access to protected routes
- **Secrets exposure**: API keys or credentials in the codebase or git history

The following are out of scope:

- Theoretical vulnerabilities without a working proof-of-concept
- Issues in third-party services (Supabase, Railway, Vercel) — report those upstream
- Self-XSS or issues requiring physical access to the victim's device
- Social engineering attacks

## Security Architecture Notes

For security researchers, the following context may be useful:

- Authentication uses Supabase magic-link + Google OAuth with ES256 JWT verification via JWKS.
- All data access routes through FastAPI, which verifies the JWT before any database operation.
- Every database query includes `AND user_id = %s` (app-layer IDOR prevention) alongside RLS policies.
- AI endpoints have rate limiting (10 req/min for coach, 3 req/hr for plan creation) and a kill switch (`LLM_ENABLED` env var).
- The app is invite-only; there is no public sign-up path.
