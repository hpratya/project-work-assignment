import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, type Profile } from "@/lib/supabase/profile";

export default async function AdminPage() {
  await requireAdmin("/admin");

  // Non-admins get an empty list from RLS even if they reach this query,
  // so the policy — not this page — is what actually protects the data.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .order("created_at", { ascending: true });

  const members = (data ?? []) as Profile[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Members</CardTitle>
          <CardDescription>
            Everyone who has signed in. Change a role from the Supabase
            dashboard&apos;s table editor.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error.message}
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.full_name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email ?? "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      member.role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {member.role}
                  </span>

                  <Link
                    href={`/admin/members/${member.id}`}
                    aria-label={`Edit ${member.full_name ?? member.email ?? "member"}`}
                    title="Edit display name"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      "shrink-0"
                    )}
                  >
                    <Pencil />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
