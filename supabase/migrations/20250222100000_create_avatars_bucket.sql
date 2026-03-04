-- ═══════════════════════════════════════════════════════════
--  وشّى | Bucket لصور الملف الشخصي (أفاتار، غلاف)
--  يُستخدم عند تعديل الملف الشخصي من صفحة الإعدادات
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- إزالة السياسات إن وُجدت
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );
