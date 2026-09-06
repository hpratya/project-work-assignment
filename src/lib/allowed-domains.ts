/**
 * Optional restriction of sign-in to one or more email domains.
 *
 * Configured with ALLOWED_EMAIL_DOMAINS, a comma-separated list:
 *
 *   ALLOWED_EMAIL_DOMAINS=company.co.th,subsidiary.com
 *
 * Leaving it unset — the default — allows any Google account, which is the
 * behaviour before this existed. Deliberately not a NEXT_PUBLIC_ variable:
 * the check has to run on the server to mean anything.
 */
function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/** Whether the restriction is switched on at all. */
export function domainRestrictionEnabled(): boolean {
  return allowedDomains().length > 0;
}

/**
 * Exact domain match only: "evil-company.co.th" must not pass a rule meant
 * for "company.co.th", and neither should a subdomain nobody vetted.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  const domains = allowedDomains();
  if (domains.length === 0) return true;

  const domain = email?.split("@").pop()?.toLowerCase();
  return domain ? domains.includes(domain) : false;
}
