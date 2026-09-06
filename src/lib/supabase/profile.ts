import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "user" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

/**
 * The signed-in user's profile row, or null when signed out.
 *
 * Reads the role from the database rather than the JWT so a role change in
 * the dashboard takes effect on the next request instead of the next token
 * refresh.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // The row is created by a trigger on sign-up, so a miss here means the
    // migration hasn't been applied yet. Fall back to the identity data from
    // the provider, at the lowest privilege level.
    const metadata = user.user_metadata ?? {};
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: metadata.full_name ?? metadata.name ?? null,
      avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
      role: "user",
    };
  }

  return data as Profile;
}

/** Redirects to /login when signed out; returns the profile otherwise. */
export async function requireUser(next: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return profile;
}

/**
 * Gate for admin-only pages.
 *
 * This protects the page render only. Anything the admin page then reads or
 * writes must ALSO be protected by an RLS policy, because the browser can
 * call the Supabase API directly without ever loading this page.
 */
export async function requireAdmin(next: string): Promise<Profile> {
  const profile = await requireUser(next);
  if (profile.role !== "admin") redirect("/");
  return profile;
}
