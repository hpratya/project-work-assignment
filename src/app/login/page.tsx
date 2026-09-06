import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "./google-sign-in-button";

/**
 * Messages for the codes /auth/callback can redirect with.
 *
 * Deliberately a fixed map: rendering ?error= verbatim would let anyone put
 * their own text ("your account is locked, call 02-…") on a trusted domain.
 */
const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Sign-in was cancelled. Please try again.",
  missing_code: "That sign-in link is incomplete. Please try again.",
  sign_in_failed: "We couldn't complete sign-in. Please try again.",
  domain_not_allowed:
    "That account isn't allowed to sign in here. Please use your work account.",
};

const GENERIC_ERROR = "Something went wrong signing in. Please try again.";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error, next } = await searchParams;

  // Only allow relative paths, so `next` can't be used as an open redirect.
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  const errorMessage =
    typeof error === "string" && error
      ? (ERROR_MESSAGES[error] ?? GENERIC_ERROR)
      : null;

  if (user) {
    redirect(safeNext ?? "/");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>
            Use your Google account to access your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <GoogleSignInButton next={safeNext} />
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Back to home
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
