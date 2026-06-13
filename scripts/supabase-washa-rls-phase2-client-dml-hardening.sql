-- WASHA Supabase RLS Phase 2 Client DML Hardening
-- Purpose: remove direct client writes from server-managed tables.
--
-- Run in Supabase SQL Editor after phase 1.
-- This script is non-destructive for data:
-- - does not drop, truncate, rename, or delete rows
-- - does not remove public SELECT access used by storefront/catalog pages
--
-- It does revoke INSERT/UPDATE/DELETE from anon/authenticated for tables whose
-- writes are performed through protected server actions, route handlers, or service_role.

begin;

-- Public storefront/catalog: keep SELECT, remove direct client writes.
revoke insert, update, delete on table
    public.artworks,
    public.categories,
    public.custom_design_art_styles,
    public.custom_design_color_packages,
    public.custom_design_colors,
    public.custom_design_garments,
    public.custom_design_option_compatibilities,
    public.custom_design_positions,
    public.custom_design_presets,
    public.custom_design_settings,
    public.custom_design_sizes,
    public.custom_design_studio_items,
    public.custom_design_styles,
    public.exclusive_designs,
    public.garment_studio_mockups,
    public.inventory_levels,
    public.product_skus,
    public.products,
    public.site_settings
from anon, authenticated;

-- Engagement and user interaction writes are validated in server actions.
revoke insert, update, delete on table
    public.artist_follows,
    public.artwork_likes,
    public.artwork_reviews,
    public.product_likes,
    public.product_reviews,
    public.product_wishlist,
    public.user_notifications
from anon, authenticated;

-- Orders, design orders, support, and public intake are all server-managed.
revoke insert, update, delete on table
    public.applications,
    public.custom_design_orders,
    public.design_order_messages,
    public.newsletter_subscribers,
    public.order_items,
    public.orders,
    public.support_messages,
    public.support_tickets
from anon, authenticated;

-- Operational/admin/ERP tables should never be written directly by browser clients.
revoke insert, update, delete on table
    public.admin_notifications,
    public.discount_coupons,
    public.distributed_rate_limits,
    public.dtf_daily_quota_usage,
    public.dtf_studio_activity_logs,
    public.event_dispatches,
    public.inventory_transactions,
    public.page_visits,
    public.profiles,
    public.push_subscriptions,
    public.role_change_audit_log,
    public.sales_records,
    public.system_logs,
    public.warehouses
from anon, authenticated;

commit;

select
    table_name,
    grantee,
    string_agg(privilege_type, ', ' order by privilege_type) as remaining_client_dml
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  and table_name in (
      'applications',
      'admin_notifications',
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
      'support_messages',
      'support_tickets',
      'system_logs',
      'user_notifications',
      'warehouses'
  )
group by table_name, grantee
order by table_name, grantee;
