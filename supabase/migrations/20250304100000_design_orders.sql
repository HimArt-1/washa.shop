-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — Custom Design Orders
--  طلبات التصميم المخصص + إعدادات البرومبت
-- ═══════════════════════════════════════════════════════════

-- ─── Design Order Status Enum ────────────────────────────

DO $$ BEGIN
    CREATE TYPE custom_design_order_status AS ENUM (
        'new',
        'in_progress',
        'awaiting_review',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Design Orders Table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_design_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number SERIAL,

    -- Customer Info
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,

    -- Design Selections
    garment_name TEXT NOT NULL,
    garment_image_url TEXT,
    color_name TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#000000',
    color_image_url TEXT,
    size_name TEXT NOT NULL,

    -- Design Method
    design_method TEXT NOT NULL CHECK (design_method IN ('from_text', 'from_image')),
    text_prompt TEXT,
    reference_image_url TEXT,

    -- Style Selections
    style_name TEXT NOT NULL,
    style_image_url TEXT,
    art_style_name TEXT NOT NULL,
    art_style_image_url TEXT,

    -- Color Palette
    color_package_name TEXT,
    custom_colors JSONB DEFAULT '[]'::JSONB,

    -- AI Prompt (auto-generated)
    ai_prompt TEXT NOT NULL,

    -- Results (uploaded by admin)
    result_design_url TEXT,
    result_mockup_url TEXT,
    result_pdf_url TEXT,

    -- Status & Workflow
    status custom_design_order_status DEFAULT 'new' NOT NULL,
    skip_results BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    assigned_to TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── Design Settings Table ───────────────────────────────

CREATE TABLE IF NOT EXISTS custom_design_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    ai_prompt_template TEXT NOT NULL DEFAULT
'You are WUSHA''s AI design assistant. Generate a HIGH-QUALITY apparel print design.

GARMENT: {{garment_name}} — COLOR: {{color_name}} ({{color_hex}})
STYLE: {{style_name}} | ART STYLE: {{art_style_name}}
COLOR PALETTE: {{colors}}

DESIGN REQUEST:
{{user_prompt}}

RULES:
- Output a clean, print-ready design on transparent background
- Follow WUSHA brand aesthetic: elegant, modern, Arabic-inspired
- Resolution: 4096×4096px minimum
- No text unless explicitly requested by the user
- Maintain color harmony with the garment color
- Style should match the selected art style precisely
- Use only the specified color palette',
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default settings row
INSERT INTO custom_design_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- ─── Auto-update trigger ─────────────────────────────────

CREATE OR REPLACE FUNCTION update_design_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_design_orders_updated_at
    BEFORE UPDATE ON custom_design_orders
    FOR EACH ROW EXECUTE FUNCTION update_design_order_updated_at();

CREATE TRIGGER trg_design_settings_updated_at
    BEFORE UPDATE ON custom_design_settings
    FOR EACH ROW EXECUTE FUNCTION update_design_order_updated_at();

-- ─── Index for faster queries ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_design_orders_status ON custom_design_orders(status);
CREATE INDEX IF NOT EXISTS idx_design_orders_created_at ON custom_design_orders(created_at DESC);

-- ─── RLS Policies ────────────────────────────────────────

ALTER TABLE custom_design_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_settings ENABLE ROW LEVEL SECURITY;

-- Public: anyone can insert (submit an order)
CREATE POLICY "Anyone can submit design orders"
    ON custom_design_orders FOR INSERT
    WITH CHECK (true);

-- Public: read own orders by email (optional)
CREATE POLICY "Service role full access to design orders"
    ON custom_design_orders FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to design settings"
    ON custom_design_settings FOR ALL
    USING (auth.role() = 'service_role');

-- Anon can read settings (for prompt template)
CREATE POLICY "Anyone can read design settings"
    ON custom_design_settings FOR SELECT
    USING (true);
