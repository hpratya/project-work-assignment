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

  if (!user) redirect("/login?next=/profile");

  // RLS restricts this to the caller's own row, and the column grant means
  // only full_name can be written even if this filter were wrong.
  //
  // Selecting the row back matters: when a policy filters an update out, the
  // API reports no error and zero rows touched, which would otherwise look
  // exactly like a successful save.
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: name })
    .eq("id", user.id)
    .select("id");

  if (error) {
    console.error(`[profile] Failed to update name: ${error.message}`);
    return { status: "error", message: "Couldn't save your name. Try again." };
  }

  if (!data || data.length === 0) {
    console.error(
      "[profile] Update matched no rows — the update policy or the grant on " +
        "profiles.full_name is probably missing. Run the latest migration."
    );
    return { status: "error", message: "Couldn't save your name. Try again." };
  }

  // The header on every page shows this name too.
  revalidatePath("/", "layout");

  return { status: "success", message: "Saved." };
}
