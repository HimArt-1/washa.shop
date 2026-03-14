-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — موكبات التصاميم الجاهزة
--  Links garments to studio items with pre-made mockup images
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS garment_studio_mockups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garment_id UUID NOT NULL REFERENCES custom_design_garments(id) ON DELETE CASCADE,
    studio_item_id UUID NOT NULL REFERENCES custom_design_studio_items(id) ON DELETE CASCADE,
    mockup_front_url TEXT,      -- صورة موكب من الأمام
    mockup_back_url TEXT,       -- صورة موكب من الخلف
    mockup_model_url TEXT,      -- صورة على موديل
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(garment_id, studio_item_id)
);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_garment_studio_mockups
    BEFORE UPDATE ON garment_studio_mockups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE garment_studio_mockups ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "garment_studio_mockups_public_read"
    ON garment_studio_mockups FOR SELECT
    USING (true);

-- Admin manage (via service role)
CREATE POLICY "garment_studio_mockups_admin_manage"
    ON garment_studio_mockups FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_garment_studio_mockups_garment ON garment_studio_mockups(garment_id);
CREATE INDEX idx_garment_studio_mockups_studio ON garment_studio_mockups(studio_item_id);
