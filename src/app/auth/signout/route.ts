import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin, publicOrigin } from "@/lib/public-origin";

export async function POST(request: NextRequest) {
  const origin = publicOrigin(request);

  // Without this, any page on the internet could auto-submit a form here and
  // sign the user out.
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${origin}/`, {
    // 303 so the browser follows up with a GET rather than re-POSTing.
    status: 303,
  });
}
