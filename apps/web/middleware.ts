import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Paths that bypass the auth check entirely.
const PUBLIC_PATHS = ["/login", "/auth"];

// Exact-segment match so siblings (/devices) aren't swept in.
function isDevPreviewPath(pathname: string): boolean {
  return pathname === "/dev" || pathname.startsWith("/dev/");
}

function isPublic(pathname: string): boolean {
  // API routes return JSON and must not receive HTML redirects.
  if (pathname.startsWith("/api/")) return true;
  // Effort-0 design-system scaffold routes (/dev/*) are dev-only and unauthenticated so
  // the primitives/token pages can be exercised signed-out. By the time this runs, the
  // middleware function below has already returned a hard 404 for /dev/* in production
  // (some of these previews render real privileged admin components with fixture data,
  // which must never be reachable in prod even behind an ordinary "must be logged in"
  // check), so this bypass is only ever live in non-production. (The nav shell used to be
  // bypassed here under a /preview prefix; it now lives at bare, normally auth-gated paths.)
  if (isDevPreviewPath(pathname)) return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /dev/* preview routes exist only to exercise components/fixtures locally and have
  // no legitimate production use — several render real privileged admin components
  // (users table, cost dashboard, allowlist CRUD) with fixture data. Falling through to
  // the ordinary "must be logged in" check would let any signed-in non-admin member view
  // that operator surface, so block outright with a real 404 rather than merely an
  // unauthenticated redirect.
  if (process.env.NODE_ENV === "production" && isDevPreviewPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

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

  // Authenticated users visiting /login are sent straight to the home shell.
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/today";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
