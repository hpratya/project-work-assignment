-- Remove the client's ability to write to profiles.
--
-- The previous migration let users edit their own full_name and avatar_url,
-- but the app has no profile-editing UI, so the grant only left a surface for
-- someone to set a misleading display name that admins then see in the member
-- list. Nothing in the app updates this table; both call sites only select.
--
-- Role changes continue to work from the Supabase dashboard, which connects
-- as an owner role and is not subject to these grants.
--
-- Re-grant the specific columns here when a profile-editing feature lands.

revoke update on public.profiles from authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
