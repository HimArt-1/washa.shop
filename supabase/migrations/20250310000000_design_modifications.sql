-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — طلب تعديل التصميم + سعر القطعة الأساسي
-- ═══════════════════════════════════════════════════════════

-- حالة جديدة: طلب تعديل التصميم
DO $$ BEGIN
    ALTER TYPE custom_design_order_status ADD VALUE 'modification_requested';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- نص طلب التعديل من العميل
ALTER TABLE custom_design_orders ADD COLUMN IF NOT EXISTS modification_request TEXT;

-- سعر القطعة الأساسي (بدون الطباعة) في المتجر الذكي
ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) DEFAULT 0;
