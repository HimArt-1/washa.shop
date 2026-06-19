-- ═══════════════════════════════════════════════════════════
-- وشّى | WASHA — Store order item color variant
-- Persists the selected product SKU color so fulfillment and inventory
-- can distinguish variants sharing the same product and size.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS color_code TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_color_code
  ON public.order_items(color_code)
  WHERE color_code IS NOT NULL;
