-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — نظام التقييمات والمراجعات
--  للمنتجات والأعمال الفنية
-- ═══════════════════════════════════════════════════════════

-- مراجعات المنتجات
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, user_id)
);

-- مراجعات الأعمال الفنية
CREATE TABLE IF NOT EXISTS artwork_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(artwork_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_artwork ON artwork_reviews(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_user ON artwork_reviews(user_id);

-- RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product reviews readable by all" ON product_reviews;
DROP POLICY IF EXISTS "Product reviews readable by all" ON product_reviews;
DROP POLICY IF EXISTS "Product reviews readable by all" ON product_reviews;
CREATE POLICY "Product reviews readable by all" ON product_reviews FOR SELECT USING (true);

-- الإدراج والتحديث عبر Server Actions (Service Role يتجاوز RLS)
DROP POLICY IF EXISTS "Product reviews insert by authenticated" ON product_reviews;
DROP POLICY IF EXISTS "Product reviews insert" ON product_reviews;
DROP POLICY IF EXISTS "Product reviews insert" ON product_reviews;
CREATE POLICY "Product reviews insert" ON product_reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Product reviews update own" ON product_reviews;
DROP POLICY IF EXISTS "Product reviews update" ON product_reviews;
DROP POLICY IF EXISTS "Product reviews update" ON product_reviews;
CREATE POLICY "Product reviews update" ON product_reviews FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Artwork reviews readable by all" ON artwork_reviews;
DROP POLICY IF EXISTS "Artwork reviews readable by all" ON artwork_reviews;
DROP POLICY IF EXISTS "Artwork reviews readable by all" ON artwork_reviews;
CREATE POLICY "Artwork reviews readable by all" ON artwork_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Artwork reviews insert by authenticated" ON artwork_reviews;
DROP POLICY IF EXISTS "Artwork reviews insert" ON artwork_reviews;
DROP POLICY IF EXISTS "Artwork reviews insert" ON artwork_reviews;
CREATE POLICY "Artwork reviews insert" ON artwork_reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Artwork reviews update own" ON artwork_reviews;
DROP POLICY IF EXISTS "Artwork reviews update" ON artwork_reviews;
DROP POLICY IF EXISTS "Artwork reviews update" ON artwork_reviews;
CREATE POLICY "Artwork reviews update" ON artwork_reviews FOR UPDATE USING (true);
