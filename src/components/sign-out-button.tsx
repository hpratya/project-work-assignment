import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** First name only, so the header button stays compact. */
function shortName(fullName: string | null, email: string | null) {
  if (fullName) return fullName.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return null;
}

export function SignOutButton({
  fullName = null,
  email = null,
  size = "sm",
  fullWidth = false,
  className,
}: {
  fullName?: string | null;
  email?: string | null;
  size?: "sm" | "default";
  fullWidth?: boolean;
  className?: string;
}) {
  const name = shortName(fullName, email);

  return (
    <form
      action="/auth/signout"
      method="post"
      className={cn(fullWidth && "w-full", className)}
    >
      <Button
        type="submit"
        variant="destructive"
        size={size}
        className={cn(fullWidth && "w-full")}
      >
        {name && (
          // Dropped on the narrowest screens so the header doesn't wrap.
          <span className="hidden max-w-[12ch] truncate sm:inline">
            {name} ·
          </span>
        )}
        <span>Sign out</span>
      </Button>
    </form>
  );
}
