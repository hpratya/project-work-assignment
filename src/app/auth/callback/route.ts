import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/public-origin";

/**
 * Redirects to the login page with a fixed error code.
 *
 * The code names one of the messages hard-coded in the login page. Provider
 * and database messages are logged rather than reflected, so an attacker
 * can't use ?error= to render their own text on a trusted domain.
 */
function loginError(
  origin: string,
  code: "oauth_denied" | "missing_code" | "sign_in_failed",
  detail: string
) {
  console.error(`[auth/callback] ${code}: ${detail}`);
  return NextResponse.redirect(`${origin}/login?error=${code}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
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
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return loginError(origin, "oauth_denied", oauthError);
  }

  if (!code) {
    return loginError(origin, "missing_code", "no code in callback URL");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginError(origin, "sign_in_failed", error.message);
  }

  // TODO(org-restriction): this is the place to enforce an allowed email
  // domain. Read the signed-in user, and if their email is outside the
  // allowed domain, call `supabase.auth.signOut()` and redirect back to
  // /login with an error, so the check cannot be bypassed from the client.

  return NextResponse.redirect(`${origin}${next}`);
}
