-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Hidden AI Garment References
--  مراجع تشغيلية واقعية للقطعة، لا تظهر للعميل وتستخدم لتوجيه التوليد النهائي.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_garments
  ADD COLUMN IF NOT EXISTS ai_reference_front_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_reference_back_url TEXT;

COMMENT ON COLUMN public.custom_design_garments.ai_reference_front_url
  IS 'Hidden operational front garment reference for WASHA AI realistic mockup generation.';

COMMENT ON COLUMN public.custom_design_garments.ai_reference_back_url
  IS 'Hidden operational back garment reference for WASHA AI realistic mockup generation.';

NOTIFY pgrst, 'reload schema';
