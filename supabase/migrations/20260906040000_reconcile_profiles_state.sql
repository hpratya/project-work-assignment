-- Brings public.profiles to its intended state from wherever it is now, and
-- adds the updated_at trigger that was missing.
--
-- The earlier migrations were applied by pasting them into the SQL editor,
-- where a single error rolls back the whole block. At least one run failed
-- part way, so the database and the migration history may disagree. Rather
-- than guess which statements landed, this restates the whole intended shape
-- idempotently: every statement is safe to run again, and running it leaves
-- the same result whatever came before.

-- Role enum ---------------------------------------------------------------

do $$
begin
  create type public.user_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end
$$;

-- Table -------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  role       public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles
  drop constraint if exists profiles_full_name_length;

alter table public.profiles
  add constraint profiles_full_name_length
  check (full_name is null or char_length(full_name) between 1 and 200);

-- Admin check -------------------------------------------------------------

-- security definer so it skips the policies on the table it reads, which is
-- what stops the admin read policy from recursing into itself.
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

-- Policies ----------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- No insert or delete policy: rows come from the trigger below and go with
-- the cascade from auth.users, so clients can do neither.

-- Column grants -----------------------------------------------------------

-- RLS decides which rows may be written; only grants can decide which
-- columns. Revoking first drops any wider grant an earlier run left behind,
-- so role stays unwritable from the client no matter what.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Timestamps --------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Profile creation --------------------------------------------------------

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone who signed in before their profile row existed.
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
