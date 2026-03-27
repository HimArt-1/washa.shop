-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Allow 'studio' as a valid design_method
--  The original table had CHECK (design_method IN ('from_text', 'from_image')).
--  DTF Studio orders use design_method = 'studio', so we expand the constraint.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
DROP CONSTRAINT IF EXISTS custom_design_orders_design_method_check;

ALTER TABLE public.custom_design_orders
ADD CONSTRAINT custom_design_orders_design_method_check
CHECK (design_method IN ('from_text', 'from_image', 'studio'));
