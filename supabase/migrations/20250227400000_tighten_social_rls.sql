-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — تشديد RLS للميزات الاجتماعية
--  منع التعديل المباشر عبر Anon Key — التعديلات تتم عبر Server Actions فقط (Service Role)
--  ملاحظة: يُنفّذ فقط إذا وُجدت الجداول (من ترحيل 20250227000000_social_features.sql)
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  -- artist_follows
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artist_follows') THEN
    DROP POLICY IF EXISTS "Users can follow artists" ON artist_follows;
    DROP POLICY IF EXISTS "Users can unfollow" ON artist_follows;
  END IF;

  -- product_wishlist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_wishlist') THEN
    DROP POLICY IF EXISTS "Users can add to wishlist" ON product_wishlist;
    DROP POLICY IF EXISTS "Users can remove from wishlist" ON product_wishlist;
  END IF;

  -- product_likes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_likes') THEN
    DROP POLICY IF EXISTS "Users can like products" ON product_likes;
    DROP POLICY IF EXISTS "Users can unlike" ON product_likes;
  END IF;
END $$;

-- النتيجة: التعديلات (INSERT/UPDATE/DELETE) تتم فقط عبر Server Actions
-- التي تستخدم Service Role وتتحقق من المستخدم عبر Clerk.
