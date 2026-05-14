-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — Add Shipping Columns to Orders
--  إضافة أعمدة التتبع والشحن لجدول الطلبات لربطها بنظام Torod
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
    -- 1. رقم التتبع (Tracking Number)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_number') THEN
        ALTER TABLE public.orders ADD COLUMN tracking_number TEXT;
    END IF;

    -- 2. اسم شركة الشحن (Courier Name)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='courier_name') THEN
        ALTER TABLE public.orders ADD COLUMN courier_name TEXT;
    END IF;

    -- 3. رابط بوليصة الشحن (Waybill URL)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='waybill_url') THEN
        ALTER TABLE public.orders ADD COLUMN waybill_url TEXT;
    END IF;

    -- 4. معرف الطلب في نظام طرود (Torod Order ID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='torod_order_id') THEN
        ALTER TABLE public.orders ADD COLUMN torod_order_id TEXT;
    END IF;

    -- 5. آخر حالة من نظام طرود (Torod Last Status)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='torod_last_status') THEN
        ALTER TABLE public.orders ADD COLUMN torod_last_status TEXT;
    END IF;

    -- 6. البيانات الإضافية وسجل الشحن (Metadata)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='metadata') THEN
        ALTER TABLE public.orders ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- تحسين البحث برقم التتبع
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_torod_order_id ON public.orders(torod_order_id);
