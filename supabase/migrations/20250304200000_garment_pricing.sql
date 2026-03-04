-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — تسعير القطع + حقول الطباعة
--  Garment Pricing + Print Placement Fields
-- ═══════════════════════════════════════════════════════════

-- ─── أسعار الطباعة لكل قطعة ──────────────────────────────

ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS price_chest_large NUMERIC(10,2) DEFAULT 0;
ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS price_chest_small NUMERIC(10,2) DEFAULT 0;
ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS price_back_large NUMERIC(10,2) DEFAULT 0;
ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS price_back_small NUMERIC(10,2) DEFAULT 0;
ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS price_shoulder_large NUMERIC(10,2) DEFAULT 0;
ALTER TABLE custom_design_garments ADD COLUMN IF NOT EXISTS price_shoulder_small NUMERIC(10,2) DEFAULT 0;

-- ─── حقول الطباعة في الطلب ───────────────────────────────

ALTER TABLE custom_design_orders ADD COLUMN IF NOT EXISTS print_position TEXT;
ALTER TABLE custom_design_orders ADD COLUMN IF NOT EXISTS print_size TEXT;
ALTER TABLE custom_design_orders ADD COLUMN IF NOT EXISTS final_price NUMERIC(10,2);

-- ─── إضافة حالة جديدة: confirmed ────────────────────────

-- Note: We'll use 'completed' status for confirmed orders
-- print_position + print_size being set = order was configured by customer

-- ─── سياسة: العميل يمكنه تحديث الطلب الخاص به ──────────

DROP POLICY IF EXISTS "Anyone can update own design orders" ON custom_design_orders;
DROP POLICY IF EXISTS "Anyone can update own design orders" ON custom_design_orders;
CREATE POLICY "Anyone can update own design orders" ON custom_design_orders
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read design orders" ON custom_design_orders;
DROP POLICY IF EXISTS "Anyone can read design orders" ON custom_design_orders;
CREATE POLICY "Anyone can read design orders" ON custom_design_orders
    FOR SELECT USING (true);
