import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HealthPage() {
  const supabase = await createClient();

  // Query a table that doesn't need to exist: any response from Supabase
  // (even "relation does not exist") proves the URL/key can reach the
  // project. Only a network failure or bad credentials counts as an error.
  let ok = false;
  let message: string | undefined;

  try {
    const { error } = await supabase
      .from("__health_check__")
      .select("*", { head: true, count: "exact" });

    // Postgres error 42P01 = table doesn't exist, which still means we
    // successfully reached the database.
    if (!error || error.code === "42P01") {
      ok = true;
    } else {
      message = `${error.code ?? ""} ${error.message}`.trim();
    }
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }

  // This page is public, and the message can carry schema or permission
  // details. Log it for us, show it only while developing.
  if (message) {
    console.error(`[health] Supabase check failed: ${message}`);
    if (process.env.NODE_ENV !== "development") {
      message = "See the server logs for details.";
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Supabase connection status</CardTitle>
          <CardDescription>
            Result of a single request made from a Server Component.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ok ? (
            <p className="text-sm font-medium text-green-600">
              ✅ Connected successfully. Supabase responded without error.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">❌ Connection failed.</p>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {message}
              </pre>
              <p className="text-xs text-muted-foreground">
                Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
                in .env.local are correct.
              </p>
            </div>
          )}
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
