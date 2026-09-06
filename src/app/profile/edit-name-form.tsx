"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateFullName, type UpdateNameState } from "./actions";

const initialState: UpdateNameState = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function EditNameForm({
  defaultName,
  userId,
}: {
  defaultName: string;
  /** Omit to edit your own name. Admins pass a member's id. */
  userId?: string;
}) {
  const [state, formAction] = useActionState(updateFullName, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="full_name" className="text-sm font-medium">
        Display name
      </label>

      {/* Not a security boundary — the row this may write is decided by the
          update policies on profiles, not by this field. */}
      {userId && <input type="hidden" name="user_id" value={userId} />}

      <div className="flex gap-2">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={defaultName}
          maxLength={80}
          required
          autoComplete="name"
        />
        <SaveButton />
      </div>

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium",
            state.status === "error"
              ? "bg-destructive/10 text-destructive"
              : // Explicit greens rather than a theme token: the palette has
                // no success colour, and these stay legible in both themes.
                "bg-green-500/10 text-green-700 dark:text-green-400"
          )}
        >
          {state.status === "success" ? `✓ ${state.message}` : state.message}
        </p>
      )}
    </form>
  );
}
