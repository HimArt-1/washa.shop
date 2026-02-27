-- ═══════════════════════════════════════════════════════════
--  وشّى | تصاميم وشّى الحصرية + أسعار القطع
-- ═══════════════════════════════════════════════════════════

-- جدول التصاميم الحصرية (مطبوعات وشّى الخاصة)
CREATE TABLE IF NOT EXISTS exclusive_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exclusive_designs_active ON exclusive_designs(is_active);
CREATE INDEX IF NOT EXISTS idx_exclusive_designs_sort ON exclusive_designs(sort_order);

-- RLS
ALTER TABLE exclusive_designs ENABLE ROW LEVEL SECURITY;

-- الجميع يقرأ التصاميم النشطة
CREATE POLICY "Exclusive designs viewable when active" ON exclusive_designs
  FOR SELECT USING (is_active = true);

-- الأدمن فقط يدير
CREATE POLICY "Admins manage exclusive designs" ON exclusive_designs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role = 'admin'
    )
  );

-- إدراج أسعار القطع الافتراضية في site_settings (إن لم تكن موجودة)
INSERT INTO site_settings (key, value)
VALUES ('creation_prices', '{"tshirt": 89, "hoodie": 149, "pullover": 129}'::jsonb)
ON CONFLICT (key) DO NOTHING;
