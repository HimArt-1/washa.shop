-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — المتجر الذكي (صمم قطعتك بنفسك)
--  Smart Store: custom design tables
-- ═══════════════════════════════════════════════════════════

-- ─── القطع (الملابس) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_design_garments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_garments_active ON custom_design_garments(is_active, sort_order);

-- ─── ألوان القطع ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_design_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garment_id UUID NOT NULL REFERENCES custom_design_garments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL DEFAULT '#000000',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_colors_garment ON custom_design_colors(garment_id);

-- ─── المقاسات ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_design_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garment_id UUID NOT NULL REFERENCES custom_design_garments(id) ON DELETE CASCADE,
  color_id UUID REFERENCES custom_design_colors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_front_url TEXT,
  image_back_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_sizes_garment ON custom_design_sizes(garment_id);

-- ─── أنماط التصميم ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_design_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── أساليب الرسم ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_design_art_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── باقات الألوان ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_design_color_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
--  RLS Policies
-- ═══════════════════════════════════════════════════════════

ALTER TABLE custom_design_garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_art_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_color_packages ENABLE ROW LEVEL SECURITY;

-- Public read for all active items
CREATE POLICY "Smart store garments public read" ON custom_design_garments FOR SELECT USING (true);
CREATE POLICY "Smart store colors public read" ON custom_design_colors FOR SELECT USING (true);
CREATE POLICY "Smart store sizes public read" ON custom_design_sizes FOR SELECT USING (true);
CREATE POLICY "Smart store styles public read" ON custom_design_styles FOR SELECT USING (true);
CREATE POLICY "Smart store art_styles public read" ON custom_design_art_styles FOR SELECT USING (true);
CREATE POLICY "Smart store color_packages public read" ON custom_design_color_packages FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
--  Auto-update updated_at triggers
-- ═══════════════════════════════════════════════════════════

CREATE TRIGGER set_cd_garments_updated_at BEFORE UPDATE ON custom_design_garments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_cd_colors_updated_at BEFORE UPDATE ON custom_design_colors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_cd_sizes_updated_at BEFORE UPDATE ON custom_design_sizes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_cd_styles_updated_at BEFORE UPDATE ON custom_design_styles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_cd_art_styles_updated_at BEFORE UPDATE ON custom_design_art_styles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_cd_color_packages_updated_at BEFORE UPDATE ON custom_design_color_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
--  Storage Bucket
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('smart-store', 'smart-store', true) ON CONFLICT DO NOTHING;

-- Public read policy for smart-store bucket
CREATE POLICY "Smart store images public read" ON storage.objects FOR SELECT USING (bucket_id = 'smart-store');
CREATE POLICY "Smart store images admin insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'smart-store');
CREATE POLICY "Smart store images admin update" ON storage.objects FOR UPDATE USING (bucket_id = 'smart-store');
CREATE POLICY "Smart store images admin delete" ON storage.objects FOR DELETE USING (bucket_id = 'smart-store');
