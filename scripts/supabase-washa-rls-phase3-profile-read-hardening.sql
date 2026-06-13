-- WASHA Supabase RLS Phase 3 Profile Read Hardening
-- Purpose: stop exposing private profile columns through direct anon reads.
--
-- Run after deploying code that uses server-side reads for profile joins.
-- Non-destructive:
-- - does not delete data
-- - keeps a safe public_profiles view for public artist discovery

create or replace function public.current_clerk_subject()
returns text
language sql
stable
as $$
    select coalesce(
        nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', ''),
        auth.uid()::text
    );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select profiles.id
    from public.profiles
    where profiles.clerk_id = public.current_clerk_subject()
    limit 1;
$$;

create or replace function public.has_washa_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where profiles.clerk_id = public.current_clerk_subject()
          and profiles.role = any(allowed_roles)
    );
$$;

create or replace view public.public_profiles as
select
    id,
    display_name,
    username,
    bio,
    avatar_url,
    cover_url,
    role,
    wushsha_level,
    website,
    social_links,
    is_verified,
    total_sales,
    total_artworks,
    created_at,
    updated_at
from public.profiles
where role = 'wushsha';

revoke all privileges on table public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant execute on function public.current_clerk_subject() to anon, authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.has_washa_role(text[]) to authenticated;

revoke select on table public.profiles from anon;
grant select on table public.profiles to authenticated;

drop policy if exists "Profiles viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by self" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
    on public.profiles
    for select
    to authenticated
    using (clerk_id = public.current_clerk_subject());

create policy "Staff can view profiles"
    on public.profiles
    for select
    to authenticated
    using (
        public.has_washa_role(array[
            'admin',
            'dev',
            'manager',
            'shipping_manager',
            'financial_manager',
            'support_agent',
            'booth'
        ])
    );

select
    table_name,
    grantee,
    privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'public_profiles')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
