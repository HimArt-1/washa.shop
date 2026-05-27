-- ═══════════════════════════════════════════════════════════
-- وشّى | WASHA — Order item print position
-- Stores the selected print placement label for custom design fulfillment.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS custom_position TEXT;
