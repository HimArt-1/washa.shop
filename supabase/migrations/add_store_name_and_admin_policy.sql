-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — إضافة store_name + سياسة أدمن للمنتجات
-- ═══════════════════════════════════════════════════════════

-- 1) إضافة عمود اسم المتجر (اختياري)
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_name TEXT;

-- 2) سياسة RLS: الأدمن يملك صلاحية كاملة على المنتجات
DROP POLICY IF EXISTS "Admin full access products" ON products;
DROP POLICY IF EXISTS "Admin full access products" ON products;
DROP POLICY IF EXISTS "Admin full access products" ON products;
CREATE POLICY "Admin full access products" ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND profiles.role = 'admin'
    )
  );
