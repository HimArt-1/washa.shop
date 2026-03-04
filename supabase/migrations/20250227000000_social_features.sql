-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — Social Features
--  متابعة فنان، محفوظات، إعجاب بمنتج
-- ═══════════════════════════════════════════════════════════

-- ─── متابعة الفنانين ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS artist_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_follows_follower ON artist_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_artist_follows_artist ON artist_follows(artist_id);

ALTER TABLE artist_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can follow artists" ON artist_follows;
DROP POLICY IF EXISTS "Users can follow artists" ON artist_follows;
CREATE POLICY "Users can follow artists" ON artist_follows
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR true);

DROP POLICY IF EXISTS "Users can unfollow" ON artist_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON artist_follows;
CREATE POLICY "Users can unfollow" ON artist_follows
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can read follows" ON artist_follows;
DROP POLICY IF EXISTS "Anyone can read follows" ON artist_follows;
CREATE POLICY "Anyone can read follows" ON artist_follows
  FOR SELECT USING (true);

-- ─── محفوظات المنتجات (Wishlist) ─────────────────────────
CREATE TABLE IF NOT EXISTS product_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_wishlist_user ON product_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_product_wishlist_product ON product_wishlist(product_id);

ALTER TABLE product_wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can add to wishlist" ON product_wishlist;
DROP POLICY IF EXISTS "Users can add to wishlist" ON product_wishlist;
CREATE POLICY "Users can add to wishlist" ON product_wishlist
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can remove from wishlist" ON product_wishlist;
DROP POLICY IF EXISTS "Users can remove from wishlist" ON product_wishlist;
CREATE POLICY "Users can remove from wishlist" ON product_wishlist
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can read wishlist" ON product_wishlist;
DROP POLICY IF EXISTS "Anyone can read wishlist" ON product_wishlist;
CREATE POLICY "Anyone can read wishlist" ON product_wishlist
  FOR SELECT USING (true);

-- ─── إعجاب بالمنتج ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_likes_user ON product_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_product ON product_likes(product_id);

ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can like products" ON product_likes;
DROP POLICY IF EXISTS "Users can like products" ON product_likes;
CREATE POLICY "Users can like products" ON product_likes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can unlike" ON product_likes;
DROP POLICY IF EXISTS "Users can unlike" ON product_likes;
CREATE POLICY "Users can unlike" ON product_likes
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can read likes" ON product_likes;
DROP POLICY IF EXISTS "Anyone can read likes" ON product_likes;
CREATE POLICY "Anyone can read likes" ON product_likes
  FOR SELECT USING (true);
