-- ═══════════════════════════════════════════════════════════
--  وشّى | دعم التصاميم المخصصة في الطلبات
--  product_id يصبح اختيارياً، نضيف أعمدة للتصميم المخصص
-- ═══════════════════════════════════════════════════════════

-- جعل product_id اختيارياً (للتصاميم المخصصة)
ALTER TABLE order_items
  ALTER COLUMN product_id DROP NOT NULL;

-- أعمدة التصميم المخصص
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS custom_design_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_garment TEXT,
  ADD COLUMN IF NOT EXISTS custom_title TEXT;

-- قيد: إما product_id (منتج عادي) أو custom_design_url (تصميم مخصص)
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_or_custom;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_or_custom
  CHECK (
    product_id IS NOT NULL OR custom_design_url IS NOT NULL
  );
