-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Track preset origin on custom design orders
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
ADD COLUMN IF NOT EXISTS preset_id UUID REFERENCES public.custom_design_presets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS preset_name TEXT,
ADD COLUMN IF NOT EXISTS preset_fully_aligned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_preset_id
ON public.custom_design_orders(preset_id);
