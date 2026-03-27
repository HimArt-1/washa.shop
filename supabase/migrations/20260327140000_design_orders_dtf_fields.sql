-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Add DTF Studio submission fields to design orders
-- ═══════════════════════════════════════════════════════════
--
--  When a user completes the DTF Studio wizard and confirms their
--  order, the AI-generated mockup and extracted DTF design are
--  uploaded to storage and their URLs are stored here so admins
--  can download the print-ready file directly from the workspace.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
ADD COLUMN IF NOT EXISTS dtf_mockup_url    TEXT,
ADD COLUMN IF NOT EXISTS dtf_extracted_url TEXT,
ADD COLUMN IF NOT EXISTS dtf_style_label   TEXT,
ADD COLUMN IF NOT EXISTS dtf_technique_label TEXT,
ADD COLUMN IF NOT EXISTS dtf_palette_label TEXT;

COMMENT ON COLUMN public.custom_design_orders.dtf_mockup_url
    IS 'URL of the AI-generated garment mockup submitted from DTF Studio';

COMMENT ON COLUMN public.custom_design_orders.dtf_extracted_url
    IS 'URL of the extracted transparent DTF print file submitted from DTF Studio';

COMMENT ON COLUMN public.custom_design_orders.dtf_style_label
    IS 'Artistic style label selected in DTF Studio (e.g. Sticker, Anime)';

COMMENT ON COLUMN public.custom_design_orders.dtf_technique_label
    IS 'Technique label selected in DTF Studio (e.g. Digital, Watercolor)';

COMMENT ON COLUMN public.custom_design_orders.dtf_palette_label
    IS 'Color palette label selected in DTF Studio (e.g. Neon, Pastel)';

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_has_dtf_mockup
    ON public.custom_design_orders (id)
    WHERE dtf_mockup_url IS NOT NULL;
