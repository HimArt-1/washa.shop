-- WASHA Supabase RLS Phase 1 Hardening
-- Purpose: close immediate high-risk openings without changing public storefront reads.
--
-- Run in Supabase SQL Editor.
-- This script is non-destructive for data:
-- - does not drop, truncate, or rename tables
-- - does not delete rows
--
-- It does:
-- - enable RLS on two WASHA tables that were found with RLS disabled
-- - make DTF history and SKU unit serial state server-only
-- - remove dangerous TRUNCATE/TRIGGER/REFERENCES grants from client roles
-- - restrict a telemetry policy that was accidentally open to all roles
-- - replace a design-position write policy that allowed every authenticated user

begin;

alter table public.dtf_design_history enable row level security;
alter table public.sku_unit_serial enable row level security;

revoke all privileges on table public.dtf_design_history from anon, authenticated;
revoke all privileges on table public.sku_unit_serial from anon, authenticated;

revoke execute on function public.get_next_unit_serials(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_next_unit_serials(uuid, integer) to service_role;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

drop policy if exists "Service role can orchestrate logs" on public.dtf_studio_activity_logs;
create policy "Service role can orchestrate logs"
    on public.dtf_studio_activity_logs
    for all
    to service_role
    using (true)
    with check (true);

drop policy if exists "Enable write access for admins" on public.custom_design_positions;
drop policy if exists "Admins can manage design positions" on public.custom_design_positions;
create policy "Admins can manage design positions"
    on public.custom_design_positions
    for all
    using (
        exists (
            select 1
            from public.profiles p
            where p.clerk_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
              and p.role in ('admin', 'dev', 'manager')
        )
    )
    with check (
        exists (
            select 1
            from public.profiles p
            where p.clerk_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
              and p.role in ('admin', 'dev', 'manager')
        )
    );

commit;

select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    coalesce(g.grants_to_clients, 0) as grants_to_clients,
    coalesce(p.policy_count, 0) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
    select table_name, count(*)::int as grants_to_clients
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
    group by table_name
) g on g.table_name = c.relname
left join (
    select tablename, count(*)::int as policy_count
    from pg_policies
    where schemaname = 'public'
    group by tablename
) p on p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('dtf_design_history', 'sku_unit_serial', 'dtf_studio_activity_logs', 'custom_design_positions')
order by c.relname;
