import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/supabase/profile";
import { SignOutButton } from "@/components/sign-out-button";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ProfilePage() {
  const profile = await requireUser("/profile");

  const { full_name: fullName, avatar_url: avatarUrl, email, role } = profile;
  const displayName = fullName ?? email ?? "Signed-in user";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Your profile</CardTitle>
          <CardDescription>
            Details from the Google account you signed in with.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={72}
                height={72}
                className="size-18 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex size-18 shrink-0 items-center justify-center rounded-full border bg-muted text-xl font-medium text-muted-foreground"
              >
                {initials(displayName)}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <p className="truncate text-lg font-semibold">{displayName}</p>
              {email && (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              )}
            </div>
          </div>

          <dl className="divide-y rounded-lg border text-sm">
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="truncate font-medium">{fullName ?? "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{email ?? "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    role === "admin"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {role}
                </span>
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              Back to home
            </Link>
            <SignOutButton
              fullName={fullName}
              email={email}
              size="default"
              fullWidth
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
