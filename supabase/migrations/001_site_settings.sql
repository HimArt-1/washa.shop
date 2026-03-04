-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — Site Settings Migration
--  شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO site_settings (key, value) VALUES
  ('visibility', '{"gallery": false, "store": false, "signup": false, "join": true, "ai_section": true}'::jsonb),
  ('site_info', '{"name": "وشّى", "description": "منصة الفن العربي الأصيل", "email": "", "phone": "", "instagram": "", "twitter": "", "tiktok": ""}'::jsonb),
  ('shipping', '{"flat_rate": 30, "free_above": 500, "tax_rate": 15}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings readable by everyone" ON site_settings;
DROP POLICY IF EXISTS "Settings readable by everyone" ON site_settings;
DROP POLICY IF EXISTS "Settings readable by everyone" ON site_settings;
CREATE POLICY "Settings readable by everyone" ON site_settings FOR SELECT USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_site_settings_updated_at ON site_settings;
CREATE TRIGGER set_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
