import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Paths that bypass the auth check entirely.
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string): boolean {
  // API routes return JSON and must not receive HTML redirects.
  if (pathname.startsWith("/api/")) return true;
  // Effort-0/1 redesign scaffold routes are dev-only and unauthenticated so the
  // design system (/dev/*) and the nav shell (/preview/*) can be exercised signed-out.
  // NODE_ENV is inlined by Next at build, so this branch is dead-code-eliminated in any
  // production build — the bypass cannot execute there, where these routes stay
  // auth-gated. Exact-segment match so siblings (/devices, /previewer) aren't swept in.
  if (
    process.env.NODE_ENV !== "production" &&
    (pathname === "/dev" ||
      pathname.startsWith("/dev/") ||
      pathname === "/preview" ||
      pathname.startsWith("/preview/"))
  ) {
    return true;
  }
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  // Start with a pass-through response; the cookie setAll below may replace it.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the forwarded request and the response so
          // the browser and server stay in sync.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — must happen before any redirect logic.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users visiting /login are sent straight to the dashboard.
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
