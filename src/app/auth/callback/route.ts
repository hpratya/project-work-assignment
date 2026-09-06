import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The origin the browser actually used.
 *
 * Behind a load balancer (Vercel included) `request.url` carries the internal
 * deployment host, not the domain the user is on. Redirecting to that host
 * would land the user on a different origin than the one the session cookies
 * were just written for, so they'd arrive back looking signed out.
 */
function publicOrigin(request: NextRequest, fallback: string) {
  if (process.env.NODE_ENV === "development") return fallback;

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost) return fallback;

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${forwardedHost}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin: rawOrigin } = new URL(request.url);
  const origin = publicOrigin(request, rawOrigin);
  const code = searchParams.get("code");

  // Where to send the user once they're signed in. Only relative paths are
  // accepted, so this can't be turned into an open redirect.
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  // Google can redirect back with an error instead of a code
  // (e.g. the user cancelled the consent screen).
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing authorization code.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // TODO(org-restriction): this is the place to enforce an allowed email
  // domain. Read the signed-in user, and if their email is outside the
  // allowed domain, call `supabase.auth.signOut()` and redirect back to
  // /login with an error, so the check cannot be bypassed from the client.

  return NextResponse.redirect(`${origin}${next}`);
}
