-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Add RBAC Roles to Profiles
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop existing role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add new role constraint supporting the new roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'wushsha', 'subscriber', 'dev', 'shipping_manager', 'financial_manager', 'support_agent', 'booth'));

COMMIT;
