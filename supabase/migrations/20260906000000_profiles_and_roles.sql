-- Profiles table with a role column, mirrored from auth.users on sign-up.
--
-- Roles live here rather than in auth.users.raw_user_meta_data because users
-- can rewrite their own metadata from the browser via auth.updateUser(),
-- which would let anyone promote themselves to admin.

create type public.user_role as enum ('user', 'admin');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  role       public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Answers "is the current user an admin?" without tripping RLS recursion:
-- security definer means this runs as the owner and skips the policies on
-- public.profiles, so policies below can call it safely.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- Read: everyone sees their own row, admins see every row.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

-- Update: only your own row. Which *columns* may be written is enforced by
-- the column grants below, since RLS itself cannot restrict single columns.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- No insert/delete policy: rows are created by the trigger below and removed
-- by the cascade from auth.users, so clients can do neither.

-- Column-level grants are what actually stop a user from writing their own
-- role. Without this, "profiles_update_own" would happily allow it.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Create the profile row on sign-up, seeding it from the Google identity.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed in before this migration ran.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
from auth.users as u
on conflict (id) do nothing;
