-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — AI Garment Reference Mode
--  يحدد هل يعتمد WASHA AI على مرجع القطعة المخفي أو يولد موكبا واقعيا من وصف القطعة فقط.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_garments
  ADD COLUMN IF NOT EXISTS ai_reference_mode TEXT NOT NULL DEFAULT 'match_reference';

ALTER TABLE public.custom_design_garments
  DROP CONSTRAINT IF EXISTS custom_design_garments_ai_reference_mode_check;

ALTER TABLE public.custom_design_garments
  ADD CONSTRAINT custom_design_garments_ai_reference_mode_check
  CHECK (ai_reference_mode IN ('match_reference', 'prompt_realistic'));

COMMENT ON COLUMN public.custom_design_garments.ai_reference_mode
  IS 'Controls whether WASHA AI uses hidden garment references (match_reference) or generates a realistic garment from product specs only (prompt_realistic).';

NOTIFY pgrst, 'reload schema';
