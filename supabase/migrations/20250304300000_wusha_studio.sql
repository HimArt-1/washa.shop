-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — ستيديو وشّى (WUSHA Studio)
--  Smart Store: WUSHA Studio custom design items
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS custom_design_studio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  main_image_url TEXT,
  mockup_image_url TEXT,
  model_image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_studio_items_active ON custom_design_studio_items(is_active, sort_order);

-- ═══════════════════════════════════════════════════════════
--  RLS Policies
-- ═══════════════════════════════════════════════════════════

ALTER TABLE custom_design_studio_items ENABLE ROW LEVEL SECURITY;

-- Public read for all active items
DROP POLICY IF EXISTS "Smart store studio items public read" ON custom_design_studio_items;
CREATE POLICY "Smart store studio items public read" ON custom_design_studio_items FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
--  Auto-update updated_at trigger
-- ═══════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_cd_studio_items_updated_at ON custom_design_studio_items;
CREATE TRIGGER set_cd_studio_items_updated_at 
BEFORE UPDATE ON custom_design_studio_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
