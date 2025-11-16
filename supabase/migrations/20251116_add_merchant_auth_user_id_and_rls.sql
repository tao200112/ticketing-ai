-- ============================================
-- PartyTix - Merchants auth_user_id + RLS migration (safe)
-- Date: 2025-11-16
-- Goal:
--   1) Add merchants.auth_user_id (UUID) to link Supabase Auth users
--   2) Backfill auth_user_id from auth.users by email (case-insensitive)
--   3) Enable/adjust RLS so that authenticated user (auth.uid() = auth_user_id)
--      can read/update their own merchant row
--   4) Limit INSERT/DELETE to service_role
--   5) Keep existing data and policies safe; drop/replace only necessary policies
-- ============================================

begin;

-- 1) Add column if not exists
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'merchants'
      and column_name  = 'auth_user_id'
  ) then
    alter table public.merchants
      add column auth_user_id uuid null;
    comment on column public.merchants.auth_user_id
      is 'Supabase Auth user id (auth.users.id). Optional; used for RLS.';
  end if;
end$$;

-- 2) Backfill auth_user_id from auth.users by matching email (case-insensitive)
--    This assumes auth schema is accessible (default in Supabase)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='auth' and table_name='users') then
    update public.merchants m
    set auth_user_id = au.id
    from auth.users au
    where m.auth_user_id is null
      and lower(m.email) = lower(au.email);
  end if;
end$$;

-- 3) Indexes (if not exist)
create index if not exists idx_merchants_auth_user_id on public.merchants (auth_user_id);
-- optional: ensure email uniqueness if desired (skip if already exists/has duplicates)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.merchants'::regclass
      and contype = 'u'
      and conname = 'merchants_email_unique'
  ) then
    -- Only add if there are no duplicates
    if not exists (
      select 1 from (
        select lower(email) as e, count(*) c
        from public.merchants
        where email is not null
        group by lower(email)
        having count(*) > 1
      ) t
    ) then
      alter table public.merchants
        add constraint merchants_email_unique unique (email);
    end if;
  end if;
end$$;

-- 4) Enable RLS
alter table public.merchants enable row level security;

-- 5) Drop legacy/overlapping policies that refer to old owner_* columns or generic wide-open rules
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename='merchants'
      and (
        policyname ilike '%owner%' or
        policyname ilike '%insert%' or
        policyname ilike '%update%' or
        policyname ilike '%select%' or
        policyname ilike '%delete%'
      )
  loop
    -- Drop any existing policy to avoid conflicts; we will recreate explicit ones below
    execute format('drop policy if exists %I on public.merchants', p.policyname);
  end loop;
end$$;

-- 6) RLS policies for merchants
-- 6.1) Allow authenticated users to SELECT their own merchant row (by auth_user_id)
create policy merchants_select_own
on public.merchants
for select
to authenticated
using (
  -- If auth_user_id is set, require match
  (auth_user_id is not null and auth.uid() = auth_user_id)
  -- If auth_user_id is null, optionally allow by email match (fallback).
  -- Comment out if you don't want email-based fallback.
  or (auth_user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
);

-- 6.2) Allow authenticated users to UPDATE their own merchant row
create policy merchants_update_own
on public.merchants
for update
to authenticated
using (
  (auth_user_id is not null and auth.uid() = auth_user_id)
  or (auth_user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
)
with check (
  (auth_user_id is not null and auth.uid() = auth_user_id)
  or (auth_user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
);

-- 6.3) Allow service_role full access (insert/update/delete/select)
create policy merchants_service_role_all
on public.merchants
for all
to service_role
using (true)
with check (true);

-- 6.4) (Optional) Disallow INSERT/DELETE for authenticated users explicitly by not creating policies for them
-- Only service_role can insert/delete due to lack of policies covering those commands for 'authenticated'.

-- 7) Sanity checks (informational)
do $$
declare
  cnt_total bigint;
  cnt_linked bigint;
begin
  select count(*) into cnt_total from public.merchants;
  select count(*) into cnt_linked from public.merchants where auth_user_id is not null;
  raise notice 'Merchants total: %, linked to auth.users: %', cnt_total, cnt_linked;
end$$;

commit;

-- End of migration


