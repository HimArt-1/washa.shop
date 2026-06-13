-- WASHA Supabase Foreign Tables Quarantine
-- Purpose: immediately isolate tables that do not belong to the WASHA schema.
--
-- This script is non-destructive for data:
-- - does not drop tables
-- - does not truncate rows
-- - does not rename objects
--
-- It does:
-- - enable RLS on the listed foreign tables
-- - revoke anon/authenticated table privileges
-- - remove permissive policies from the listed foreign tables
-- - add a comment for audit visibility

do $$
declare
    target_tables text[] := array[
        'analytics_logs',
        'attendance_logs',
        'audit_logs',
        'auth_audit_logs',
        'classes',
        'client_error_logs',
        'daily_summaries',
        'dismissal_calls',
        'dismissal_records',
        'dismissal_schedules',
        'exits',
        'guardian_login_security',
        'notifications',
        'pages',
        'rate_limits',
        'settings',
        'students',
        'sync_tombstones',
        'users',
        'violations'
    ];
    table_name text;
    policy_record record;
begin
    foreach table_name in array target_tables loop
        if to_regclass(format('public.%I', table_name)) is null then
            raise notice 'Skipping missing table public.%', table_name;
            continue;
        end if;

        execute format('alter table public.%I enable row level security', table_name);
        execute format('revoke all privileges on table public.%I from anon', table_name);
        execute format('revoke all privileges on table public.%I from authenticated', table_name);
        execute format(
            'comment on table public.%I is %L',
            table_name,
            'Quarantined by WASHA drift cleanup: foreign/non-WASHA table isolated from anon/authenticated clients.'
        );

        for policy_record in
            select policyname
            from pg_policies
            where schemaname = 'public'
              and tablename = table_name
        loop
            execute format('drop policy if exists %I on public.%I', policy_record.policyname, table_name);
        end loop;
    end loop;
end $$;

select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    coalesce(pc.policy_count, 0) as policy_count,
    coalesce(g.grants_to_clients, 0) as grants_to_clients,
    obj_description(c.oid, 'pg_class') as table_comment
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
    select tablename, count(*)::int as policy_count
    from pg_policies
    where schemaname = 'public'
    group by tablename
) pc on pc.tablename = c.relname
left join (
    select table_name, count(*)::int as grants_to_clients
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
    group by table_name
) g on g.table_name = c.relname
where n.nspname = 'public'
  and c.relname in (
    'analytics_logs',
    'attendance_logs',
    'audit_logs',
    'auth_audit_logs',
    'classes',
    'client_error_logs',
    'daily_summaries',
    'dismissal_calls',
    'dismissal_records',
    'dismissal_schedules',
    'exits',
    'guardian_login_security',
    'notifications',
    'pages',
    'rate_limits',
    'settings',
    'students',
    'sync_tombstones',
    'users',
    'violations'
  )
order by c.relname;
