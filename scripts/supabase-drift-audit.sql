-- WASHA Supabase Drift Audit
-- Safe to run: one read-only SELECT statement.
-- It does not drop, rename, revoke, alter, or update anything.

with expected_public_tables as (
    select unnest(array[
        'admin_notifications',
        'applications',
        'artist_follows',
        'artwork_likes',
        'artwork_reviews',
        'artworks',
        'categories',
        'custom_design_art_styles',
        'custom_design_color_packages',
        'custom_design_colors',
        'custom_design_garments',
        'custom_design_option_compatibilities',
        'custom_design_orders',
        'custom_design_positions',
        'custom_design_presets',
        'custom_design_settings',
        'custom_design_sizes',
        'custom_design_studio_items',
        'custom_design_styles',
        'design_order_messages',
        'discount_coupons',
        'distributed_rate_limits',
        'dtf_daily_quota_usage',
        'dtf_design_history',
        'dtf_studio_activity_logs',
        'event_dispatches',
        'exclusive_designs',
        'garment_studio_mockups',
        'inventory_levels',
        'inventory_transactions',
        'newsletter_subscribers',
        'order_items',
        'orders',
        'page_visits',
        'product_likes',
        'product_reviews',
        'product_skus',
        'product_wishlist',
        'products',
        'profiles',
        'push_subscriptions',
        'role_change_audit_log',
        'sales_records',
        'site_settings',
        'sku_unit_serial',
        'support_messages',
        'support_tickets',
        'system_logs',
        'user_notifications',
        'warehouses'
    ]::text[]) as table_name
),
public_tables as (
    select
        c.oid,
        n.nspname as schema_name,
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced,
        coalesce(s.n_live_tup, 0) as estimated_rows,
        pg_total_relation_size(c.oid) as total_bytes,
        obj_description(c.oid, 'pg_class') as table_comment
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
),
policy_counts as (
    select schemaname, tablename, count(*)::int as policy_count
    from pg_policies
    where schemaname = 'public'
    group by schemaname, tablename
),
unexpected_tables as (
    select p.*
    from public_tables p
    left join expected_public_tables e on e.table_name = p.table_name
    where e.table_name is null
),
audit_rows as (
    select
        '01_unexpected_public_table' as audit_type,
        u.table_name,
        jsonb_build_object(
            'schema', u.schema_name,
            'rls_enabled', u.rls_enabled,
            'rls_forced', u.rls_forced,
            'estimated_rows', u.estimated_rows,
            'total_size', pg_size_pretty(u.total_bytes),
            'comment', u.table_comment
        ) as details
    from unexpected_tables u

    union all

    select
        '02_washa_rls_status' as audit_type,
        p.table_name,
        jsonb_build_object(
            'rls_enabled', p.rls_enabled,
            'rls_forced', p.rls_forced,
            'policy_count', coalesce(pc.policy_count, 0)
        ) as details
    from public_tables p
    join expected_public_tables e on e.table_name = p.table_name
    left join policy_counts pc on pc.schemaname = p.schema_name and pc.tablename = p.table_name

    union all

    select
        '03_unexpected_table_policy' as audit_type,
        p.tablename as table_name,
        jsonb_build_object(
            'policy_name', p.policyname,
            'roles', p.roles,
            'command', p.cmd,
            'using', p.qual,
            'with_check', p.with_check
        ) as details
    from pg_policies p
    join unexpected_tables u on u.table_name = p.tablename
    where p.schemaname = 'public'

    union all

    select
        '04_generated_quarantine_sql' as audit_type,
        u.table_name,
        jsonb_build_object(
            'enable_rls_sql', format('alter table public.%I enable row level security;', u.table_name),
            'revoke_client_access_sql', format('revoke all on table public.%I from anon, authenticated;', u.table_name),
            'rename_after_backup_sql', format(
                'alter table public.%I rename to quarantine_%s_%I;',
                u.table_name,
                to_char(current_date, 'YYYYMMDD'),
                u.table_name
            ),
            'drop_after_retention_sql', format('drop table if exists public.%I cascade;', u.table_name)
        ) as details
    from unexpected_tables u
)
select audit_type, table_name, details
from audit_rows
order by audit_type, table_name;
