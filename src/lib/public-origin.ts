import type { NextRequest } from "next/server";

/** Normalises "example.com" or "https://example.com/path" down to a host. */
function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host;
  } catch {
    return null;
  }
}

/** The hosts this deployment is willing to redirect a signed-in user to. */
function allowedHosts(): string[] {
  return [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map(hostOf)
    .filter((host): host is string => host !== null);
}

/**
 * The origin to build redirects from.
 *
 * Behind a load balancer `request.url` carries the internal deployment host
 * rather than the domain the browser is on, so redirecting to it would drop
 * the session cookies that were just written for the user's origin.
 *
 * `x-forwarded-host` names that domain, but it is a request header: trusting
 * it blindly turns every redirect here into an open redirect the moment a
 * proxy in front of this app forwards a client-supplied value. So it is only
 * honoured when it matches a host this deployment actually serves.
 */
export function publicOrigin(request: NextRequest): string {
  const rawOrigin = new URL(request.url).origin;

  // No proxy in front of the dev server, so request.url is already right.
  if (process.env.NODE_ENV === "development") return rawOrigin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const allowed = allowedHosts();

  if (forwardedHost && allowed.includes(forwardedHost)) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  // Unknown or spoofed host. Prefer the configured production domain over the
  // header; fall back to request.url only when nothing is configured.
  const production =
    hostOf(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    hostOf(process.env.NEXT_PUBLIC_SITE_URL);

  return production ? `https://${production}` : rawOrigin;
}

/**
 * Rejects cross-site form posts.
 *
 * Compared against the host actually serving the request, not the canonical
 * origin: this app answers on more than one hostname (Vercel's aliases), and
 * a user on an alias is still same-origin with themselves.
 *
 * A page cannot forge the Origin header of a form it submits, so a mismatch
 * means the post came from another site. Requests with no Origin at all
 * (older clients, curl) are allowed, since this only guards a sign-out.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return true;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(requestOrigin).host === host;
  } catch {
    return false;
  }
}
