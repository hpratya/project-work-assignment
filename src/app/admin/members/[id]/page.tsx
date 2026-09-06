import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { EditNameForm } from "@/app/profile/edit-name-form";

export default async function MemberPage({
  params,
}: PageProps<"/admin/members/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/members/${id}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const member = data as Profile;
  const displayName = member.full_name ?? member.email ?? "Member";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit member</CardTitle>
          <CardDescription>
            Change how this member&apos;s name appears across the app.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            {member.avatar_url ? (
              <Image
                src={member.avatar_url}
                alt=""
                width={56}
                height={56}
                className="size-14 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full border bg-muted text-lg font-medium text-muted-foreground"
              >
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {member.email ?? "—"}
              </p>
            </div>
          </div>

          <EditNameForm defaultName={member.full_name ?? ""} userId={member.id} />

          <p className="text-xs text-muted-foreground">
            Role is{" "}
            <span className="font-medium text-foreground">{member.role}</span>.
            Roles are changed from the Supabase dashboard, not here.
          </p>

          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Back to members
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
