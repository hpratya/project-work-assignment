import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/public-origin";
import { isEmailAllowed } from "@/lib/allowed-domains";

/**
 * Redirects to the login page with a fixed error code.
 *
 * The code names one of the messages hard-coded in the login page. Provider
 * and database messages are logged rather than reflected, so an attacker
 * can't use ?error= to render their own text on a trusted domain.
 */
function loginError(
  origin: string,
  code: "oauth_denied" | "missing_code" | "sign_in_failed" | "domain_not_allowed",
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
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginError(origin, "sign_in_failed", error.message);
  }

  // Enforced here rather than with Google's `hd` parameter, which only
  // filters the account picker and can be dropped by anyone driving the
  // flow by hand. No-op until ALLOWED_EMAIL_DOMAINS is set.
  const email = data.user?.email;
  if (!isEmailAllowed(email)) {
    await supabase.auth.signOut();
    return loginError(
      origin,
      "domain_not_allowed",
      `rejected sign-in from ${email ?? "an account with no email"}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
