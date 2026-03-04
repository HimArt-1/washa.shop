-- ═══════════════════════════════════════════════════════════
--  وشّى | Bucket لصور المنتجات
--  يُستخدم عند إضافة/تعديل المنتجات من لوحة الإدارة
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- إزالة السياسات إن وُجدت (لتجنب الخطأ عند إعادة التشغيل)
DROP POLICY IF EXISTS "Public read products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON storage.objects;

-- القراءة عامة (لعرض صور المنتجات في المتجر)
DROP POLICY IF EXISTS "Public read products" ON storage.objects;
CREATE POLICY "Public read products" ON storage.objects FOR SELECT
  USING ( bucket_id = 'products' );

-- المصادقون يمكنهم الرفع (للوحة الإدارة)
DROP POLICY IF EXISTS "Authenticated users can upload products" ON storage.objects;
CREATE POLICY "Authenticated users can upload products" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );

-- المصادقون يمكنهم التحديث والحذف
DROP POLICY IF EXISTS "Authenticated users can update products" ON storage.objects;
CREATE POLICY "Authenticated users can update products" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can delete products" ON storage.objects;
CREATE POLICY "Authenticated users can delete products" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );
