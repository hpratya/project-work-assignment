-- Let users rename themselves, which the profile page now offers.
--
-- Grants exactly one column. role stays unwritable from the client, so this
-- cannot be turned into self-promotion, and avatar_url stays unwritable
-- because nothing edits it.

-- A user can write their own row...
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ...but only this column of it. RLS cannot express that; grants can.
grant update (full_name) on public.profiles to authenticated;

-- The client can PATCH this column directly through PostgREST, so the size
-- limit belongs here rather than only in the form.
alter table public.profiles
  add constraint profiles_full_name_length
  check (full_name is null or char_length(full_name) between 1 and 200);
