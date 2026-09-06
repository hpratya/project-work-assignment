import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/**
 * Sign a user out once they've gone this long without a request. Overridable
 * with SESSION_IDLE_TIMEOUT_MINUTES, mainly so the behaviour can be verified
 * without waiting out the real window.
 */
const IDLE_TIMEOUT_MS =
  (Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES) || 30) * 60 * 1000;

const ACTIVITY_COOKIE = "last-activity";

/**
 * Deliberately far longer than the idle window. If the cookie expired on its
 * own schedule, a timed-out session would come back looking like a brand new
 * one — no cookie, nothing to compare against — and never time out at all.
 */
const ACTIVITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Next prefetches links the user only hovered near. Counting those as
 * activity would keep a session alive with nobody at the keyboard.
 */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch"
  );
}

export async function proxy(request: NextRequest) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error(
      `[proxy] Missing required env var(s): ${missing.join(", ")}. Skipping Supabase session refresh.`
    );
    return NextResponse.next({ request });
  }

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth session if expired. Required for Server Components,
  // which cannot write cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    response.cookies.delete(ACTIVITY_COOKIE);
    return response;
  }

  const lastActivity = Number(request.cookies.get(ACTIVITY_COOKIE)?.value);
  const now = Date.now();
  const idleFor = Number.isFinite(lastActivity) ? now - lastActivity : 0;

  // Never redirect a request that is already going to /login: if signing out
  // ever fails to clear the cookies, the user would otherwise bounce between
  // the two pages forever.
  const onLoginPage = request.nextUrl.pathname === "/login";

  if (idleFor > IDLE_TIMEOUT_MS && !onLoginPage) {
    try {
      // scope: "local" revokes this session only, leaving the user's other
      // devices signed in.
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error("[proxy] Idle sign-out failed, clearing cookies anyway", err);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=session_expired";

    // signOut wrote the cleared auth cookies onto `response`; carry them over
    // so the redirect is what actually clears them in the browser.
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

    // Belt and braces: if signOut didn't run, clear the auth cookies here so
    // the session can't survive the timeout.
    request.cookies
      .getAll()
      .filter((cookie) => cookie.name.startsWith("sb-"))
      .forEach((cookie) => redirect.cookies.delete(cookie.name));

    redirect.cookies.delete(ACTIVITY_COOKIE);
    return redirect;
  }

  if (!isPrefetch(request)) {
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACTIVITY_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
