"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function EditNameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState(updateFullName, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="full_name" className="text-sm font-medium">
        Display name
      </label>

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
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
