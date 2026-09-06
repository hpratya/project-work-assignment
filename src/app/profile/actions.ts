"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UpdateNameState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const MAX_NAME_LENGTH = 80;

export async function updateFullName(
  _prevState: UpdateNameState,
  formData: FormData
): Promise<UpdateNameState> {
  const name = String(formData.get("full_name") ?? "").trim();

  if (name.length === 0) {
    return { status: "error", message: "Please enter a name." };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return {
      status: "error",
      message: `Please keep it under ${MAX_NAME_LENGTH} characters.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Whose row to edit. This arrives from a form field, so it is attacker
  // controlled — it is safe only because the update policies below allow the
  // caller's own row or, for an admin, any row. A user passing someone
  // else's id gets zero rows back, not a write.
  const targetId = String(formData.get("user_id") ?? "").trim() || user.id;

  // RLS restricts which row can be written, and the column grant means only
  // full_name can be written even if this filter were wrong.
  //
  // Selecting the row back matters: when a policy filters an update out, the
  // API reports no error and zero rows touched, which would otherwise look
  // exactly like a successful save.
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: name })
    .eq("id", targetId)
    .select("id");

  if (error) {
    console.error(`[profile] Failed to update name: ${error.message}`);
    return { status: "error", message: "Couldn't save your name. Try again." };
  }

  if (!data || data.length === 0) {
    console.error(
      `[profile] Update of ${targetId} by ${user.id} matched no rows — either ` +
        "the caller isn't allowed to edit that row, or the update policy or " +
        "the grant on profiles.full_name is missing."
    );
    return { status: "error", message: "Couldn't save the name. Try again." };
  }

  // The header on every page shows this name too.
  revalidatePath("/", "layout");

  return { status: "success", message: "Saved." };
}
