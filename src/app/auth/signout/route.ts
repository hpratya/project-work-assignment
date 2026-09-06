import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Behind a load balancer `request.url` carries the internal deployment
  // host, so redirect relative to the host the browser actually used.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const target =
    process.env.NODE_ENV !== "development" && forwardedHost
      ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${forwardedHost}/`
      : new URL("/", request.url).toString();

  return NextResponse.redirect(target, {
    // 303 so the browser follows up with a GET rather than re-POSTing.
    status: 303,
  });
}
