-- Read-only check that the database matches what the migrations intend.
-- Paste into the Supabase SQL editor and compare against "expected" below.
--
-- Expected results:
--   1. update grants ....... exactly one row: UPDATE on full_name
--   2. table grants ........ SELECT (and INSERT/DELETE/etc. are harmless,
--                            RLS has no policy for them)
--   3. policies ............ four rows: select_own, select_admin,
--                            update_own, update_admin
--   4. triggers ............ on_auth_user_created, profiles_set_updated_at
--   5. constraint .......... profiles_full_name_length present
--   6. functions ........... is_admin and handle_new_user are SECURITY
--                            DEFINER; all three have a pinned search_path

-- 1. Which columns may `authenticated` write?
select privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;

-- 2. Table-level privileges.
select privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee = 'authenticated'
order by privilege_type;

-- 3. Row level security policies.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

-- 4. Triggers.
select tgname, tgrelid::regclass as on_table
from pg_trigger
where not tgisinternal
  and tgrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
order by tgname;

-- 5. Check constraints.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass and contype = 'c'
order by conname;

-- 6. Function security settings.
select
  proname,
  prosecdef as security_definer,
  proconfig as settings
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_admin', 'handle_new_user', 'set_updated_at')
order by proname;
