import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "your-project.supabase.co";

const apiHost = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).host
  : "api.fithub.app";

const cspDirectives = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for server-injected style tags and hydration scripts
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self'",
  isDev
    ? "connect-src 'self' http://localhost:54321 http://127.0.0.1:54321 http://localhost:8000 http://127.0.0.1:8000 ws://localhost:3000"
    : `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://${apiHost}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // SVGR pipeline (0.24, 09 §2). Next.js 16 runs Turbopack by default, so SVG→React
  // conversion is wired through `turbopack.rules` — NOT the legacy webpack() loader
  // block SVGR's own docs still show. Importing a `*.svg` yields a React component
  // (`import Glyph from "./glyph.svg"` → `<Glyph />`). No source code imports SVGs as
  // URLs today; public/ assets are still referenced by their `/path.svg` URL, which
  // this module rule does not touch.
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  // Next.js's dev-tools indicator defaults to bottom-left, which sat
  // directly on top of the old bespoke admin mobile tab bar's first tab on
  // mobile viewports, covering its label and shrinking its touch target
  // below the 44px minimum. Moving it to top-right (a prior attempt) just
  // relocated the collision, since the admin layout renders real content in
  // every corner. Verified via screenshot that top-right still overlapped
  // the health status text on both mobile and desktop — see
  // claude_docs/monitoring/screenshots/admin-header-fixes/. Disabling the
  // indicator entirely is the simplest fix: it's a purely dev-mode cosmetic
  // tool (build info / route type badge) with zero production impact, so
  // there's no reason to keep hunting for a clear corner on this route. (The
  // admin console itself was rebuilt desktop-only, ≥768px, in Effort 10 —
  // that bespoke mobile nav is gone — but the indicator stays disabled since
  // the reasoning above still holds for the member shell's own mobile nav.)
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
