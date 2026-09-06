-- Let admins rename other members from the admin area.
--
-- The column grant from the previous migration still applies to everyone,
-- so an admin can write full_name and nothing else — role included. Changing
-- roles stays a dashboard-only operation.
--
-- Safe to re-run: the SQL editor applies a pasted block as one transaction,
-- where a single "already exists" error would roll the whole thing back.

drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
