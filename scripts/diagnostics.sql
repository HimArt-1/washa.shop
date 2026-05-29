-- ============================================================================
-- WUSHA Platform Diagnostic Queries
-- Purpose: Identify actual problems before optimization
-- Safety: READ-ONLY queries, no modifications
-- ============================================================================

-- ============================================================================
-- 1. INVENTORY INTEGRITY CHECK
-- ============================================================================

-- Check for negative inventory (proof of race condition/overselling)
SELECT
  'CRITICAL: Negative Inventory Found' as issue_type,
  il.id,
  il.sku_id,
  ps.sku,
  p.name as product_name,
  il.available_quantity,
  il.reserved_quantity,
  il.warehouse_id,
  w.name as warehouse_name,
  il.updated_at
FROM inventory_levels il
LEFT JOIN product_skus ps ON ps.id = il.sku_id
LEFT JOIN products p ON p.id = ps.product_id
LEFT JOIN warehouses w ON w.id = il.warehouse_id
WHERE il.available_quantity < 0
ORDER BY il.updated_at DESC;

-- Check for potential overselling in recent orders
SELECT
  'WARNING: Potential Overselling' as issue_type,
  o.id as order_id,
  o.created_at,
  o.status,
  oi.sku_id,
  ps.sku,
  oi.quantity as ordered_quantity,
  il.available_quantity as current_stock,
  (il.available_quantity + il.reserved_quantity) as total_stock
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN product_skus ps ON ps.id = oi.sku_id
LEFT JOIN inventory_levels il ON il.sku_id = oi.sku_id
WHERE o.status IN ('paid', 'processing', 'completed')
  AND o.created_at > NOW() - INTERVAL '30 days'
  AND il.available_quantity < 0
ORDER BY o.created_at DESC;

-- Inventory level statistics
SELECT
  'INFO: Inventory Statistics' as info_type,
  COUNT(*) as total_skus,
  COUNT(CASE WHEN available_quantity < 0 THEN 1 END) as negative_count,
  COUNT(CASE WHEN available_quantity = 0 THEN 1 END) as out_of_stock_count,
  COUNT(CASE WHEN available_quantity < 10 THEN 1 END) as low_stock_count,
  MIN(available_quantity) as min_quantity,
  MAX(available_quantity) as max_quantity,
  AVG(available_quantity)::numeric(10,2) as avg_quantity
FROM inventory_levels;

-- ============================================================================
-- 2. WEBHOOK DUPLICATE CHECK
-- ============================================================================

-- Check if webhook_events table exists
SELECT
  'INFO: Webhook Events Table' as info_type,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'webhook_events'
  ) as table_exists;

-- Check for duplicate Stripe checkout sessions (potential duplicate webhooks)
SELECT
  'WARNING: Duplicate Stripe Sessions' as issue_type,
  stripe_checkout_session_id,
  COUNT(*) as order_count,
  array_agg(id) as order_ids,
  array_agg(status) as statuses,
  array_agg(created_at) as created_times
FROM orders
WHERE stripe_checkout_session_id IS NOT NULL
GROUP BY stripe_checkout_session_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Check for suspicious rapid order creation (could indicate race conditions)
SELECT
  'WARNING: Rapid Orders from Same User' as issue_type,
  user_id,
  COUNT(*) as order_count,
  MIN(created_at) as first_order,
  MAX(created_at) as last_order,
  (MAX(created_at) - MIN(created_at)) as time_span,
  array_agg(id ORDER BY created_at) as order_ids
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > 1
  AND (MAX(created_at) - MIN(created_at)) < INTERVAL '10 seconds'
ORDER BY order_count DESC;

-- ============================================================================
-- 3. ORDER & PAYMENT INTEGRITY
-- ============================================================================

-- Check for orders without payment confirmation
SELECT
  'WARNING: Pending Orders Over 24h' as issue_type,
  id,
  user_id,
  status,
  total_amount,
  stripe_checkout_session_id,
  created_at,
  NOW() - created_at as age
FROM orders
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Check for paid orders without inventory transactions
SELECT
  'WARNING: Paid Orders Missing Inventory Tx' as issue_type,
  o.id as order_id,
  o.created_at,
  o.status,
  o.total_amount,
  COUNT(oi.id) as item_count,
  COUNT(it.id) as transaction_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN inventory_transactions it ON it.order_id = o.id
WHERE o.status IN ('paid', 'processing', 'completed')
  AND o.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id
HAVING COUNT(it.id) = 0
ORDER BY o.created_at DESC;

-- ============================================================================
-- 4. DATABASE PERFORMANCE CHECK
-- ============================================================================

-- Check for missing indexes on frequently queried columns
SELECT
  'INFO: Table Index Analysis' as info_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_items', 'custom_design_orders', 'inventory_levels', 'products')
ORDER BY tablename, indexname;

-- Table sizes
SELECT
  'INFO: Table Sizes' as info_type,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================================
-- 5. RECENT ERROR PATTERNS
-- ============================================================================

-- Check AI usage patterns (for cost analysis)
SELECT
  'INFO: AI Usage Last 30 Days' as info_type,
  COUNT(*) as total_generations,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as daily_count
FROM ai_usage_audit
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- AI usage summary
SELECT
  'INFO: AI Usage Summary' as info_type,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM ai_usage_audit
WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- 6. CUSTOM DESIGN ORDERS STATUS
-- ============================================================================

-- Design order statistics
SELECT
  'INFO: Design Order Statistics' as info_type,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM custom_design_orders
GROUP BY status
ORDER BY count DESC;

-- Design orders stuck in awaiting_review for >7 days
SELECT
  'WARNING: Stale Design Orders' as issue_type,
  id,
  user_id,
  status,
  created_at,
  NOW() - created_at as age
FROM custom_design_orders
WHERE status = 'awaiting_review'
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at ASC
LIMIT 20;

-- ============================================================================
-- 7. ORDER VOLUME & PERFORMANCE METRICS
-- ============================================================================

-- Recent order volume (last 30 days)
SELECT
  'INFO: Order Volume Last 30 Days' as info_type,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as order_count,
  COUNT(DISTINCT user_id) as unique_customers,
  SUM(total_amount)::numeric(10,2) as daily_revenue,
  AVG(total_amount)::numeric(10,2) as avg_order_value
FROM orders
WHERE created_at > NOW() - INTERVAL '30 days'
  AND status != 'cancelled'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Overall order statistics
SELECT
  'INFO: Overall Order Statistics' as info_type,
  status,
  COUNT(*) as count,
  SUM(total_amount)::numeric(10,2) as total_revenue,
  AVG(total_amount)::numeric(10,2) as avg_order_value,
  MIN(created_at) as first_order,
  MAX(created_at) as last_order
FROM orders
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- 8. PRODUCT & INVENTORY HEALTH
-- ============================================================================

-- Products without inventory levels
SELECT
  'WARNING: Products Missing Inventory' as issue_type,
  p.id,
  p.name,
  p.sku_prefix,
  COUNT(ps.id) as sku_count,
  COUNT(il.id) as inventory_count
FROM products p
LEFT JOIN product_skus ps ON ps.product_id = p.id
LEFT JOIN inventory_levels il ON il.sku_id = ps.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku_prefix
HAVING COUNT(il.id) = 0
ORDER BY p.created_at DESC;

-- ============================================================================
-- 9. USER & PROFILE DATA
-- ============================================================================

-- User registration trends
SELECT
  'INFO: User Registration Trends' as info_type,
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_users
FROM profiles
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- Total user count
SELECT
  'INFO: Total User Count' as info_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
FROM profiles;

-- ============================================================================
-- END OF DIAGNOSTICS
-- ============================================================================
