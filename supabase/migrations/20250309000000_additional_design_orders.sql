-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Additional Design Orders
--  تصميم إضافي على نفس الطلب (بعد تأكيد التصميم الأساسي)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.custom_design_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_design_orders_parent ON public.custom_design_orders(parent_order_id);
