-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Tracker Token Expiry
--  يضيف انتهاء صلاحية لروابط تتبع الطلبات
--  الرابط يبقى صالحاً 90 يوماً من تاريخ الإنشاء
-- ═══════════════════════════════════════════════════════════

-- 1. إضافة عمود انتهاء الصلاحية
ALTER TABLE public.custom_design_orders
    ADD COLUMN IF NOT EXISTS tracker_token_expires_at TIMESTAMPTZ;

-- 2. ملء القيم للطلبات الموجودة (90 يوم من تاريخ الإنشاء)
UPDATE public.custom_design_orders
SET tracker_token_expires_at = created_at + INTERVAL '90 days'
WHERE tracker_token_expires_at IS NULL;

-- 3. جعل العمود إلزامياً بعد ملء القيم الموجودة
ALTER TABLE public.custom_design_orders
    ALTER COLUMN tracker_token_expires_at SET NOT NULL,
    ALTER COLUMN tracker_token_expires_at SET DEFAULT NOW() + INTERVAL '90 days';

-- 4. Index لتسريع استعلامات التحقق من الصلاحية
CREATE INDEX IF NOT EXISTS idx_custom_design_orders_token_expiry
    ON public.custom_design_orders (tracker_token, tracker_token_expires_at);

-- 5. دالة وظيفية لتجديد الرابط (تُستدعى من الإدارة عند الطلب)
CREATE OR REPLACE FUNCTION public.renew_tracker_token(p_order_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
BEGIN
    v_new_expiry := NOW() + INTERVAL '90 days';
    UPDATE public.custom_design_orders
    SET tracker_token_expires_at = v_new_expiry
    WHERE id = p_order_id;
    RETURN v_new_expiry;
END;
$$;

COMMENT ON COLUMN public.custom_design_orders.tracker_token_expires_at IS
    'تاريخ انتهاء صلاحية رابط التتبع العام. الرابط لا يعمل بعد هذا التاريخ.
     يمكن تجديده من الإدارة عبر الدالة renew_tracker_token(order_id).';
