-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Repair Smart Store Garment Pricing Columns
--  يضمن وجود أعمدة تسعير مواضع الطباعة حتى لو كانت migration قديمة
--  مسجلة في سجل Supabase بدون أن تكون أعمدتها موجودة فعلياً.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_garments
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_chest_large NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_chest_small NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_back_large NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_back_small NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_shoulder_large NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_shoulder_small NUMERIC(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
