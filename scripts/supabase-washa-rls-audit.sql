-- WASHA RLS Audit
-- Safe to run: read-only SELECT statements.
-- Run in Supabase SQL Editor after quarantining foreign tables.

with washa_tables as (
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
policy_counts as (
    select tablename, count(*)::int as policy_count
    from pg_policies
    where schemaname = 'public'
    group by tablename
),
client_grants as (
    select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
    group by table_name, grantee
),
table_status as (
    select
        w.table_name,
        c.oid,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced,
        coalesce(pc.policy_count, 0) as policy_count,
        coalesce(s.n_live_tup, 0) as estimated_rows,
        pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
    from washa_tables w
    left join pg_class c on c.relname = w.table_name
    left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    left join pg_stat_user_tables s on s.relid = c.oid
    left join policy_counts pc on pc.tablename = w.table_name
    where c.oid is not null
)
select
    '01_table_status' as audit_type,
    table_name,
    jsonb_build_object(
        'rls_enabled', rls_enabled,
        'rls_forced', rls_forced,
        'policy_count', policy_count,
        'estimated_rows', estimated_rows,
        'total_size', total_size
    ) as details
from table_status

union all

select
    '02_client_grants' as audit_type,
    g.table_name,
    jsonb_build_object(
        'grantee', g.grantee,
        'privileges', g.privileges
    ) as details
from client_grants g
join washa_tables w on w.table_name = g.table_name

union all

select
    '03_broad_policy' as audit_type,
    p.tablename as table_name,
    jsonb_build_object(
        'policy_name', p.policyname,
        'roles', p.roles,
        'command', p.cmd,
        'using', p.qual,
        'with_check', p.with_check
    ) as details
from pg_policies p
join washa_tables w on w.table_name = p.tablename
where p.schemaname = 'public'
  and (
    p.qual = 'true'
    or p.with_check = 'true'
    or p.roles @> array['public']::name[]
  )

order by audit_type, table_name;
