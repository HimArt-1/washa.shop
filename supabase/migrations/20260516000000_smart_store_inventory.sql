-- ═══════════════════════════════════════════════════════════
-- وشّى | WASHA — Smart Store Inventory
-- Adds quantity tracking for smart-store garment size variants.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_sizes
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS sku_id UUID REFERENCES public.product_skus(id) ON DELETE SET NULL;

ALTER TABLE public.custom_design_sizes
  DROP CONSTRAINT IF EXISTS custom_design_sizes_stock_quantity_nonnegative;
ALTER TABLE public.custom_design_sizes
  ADD CONSTRAINT custom_design_sizes_stock_quantity_nonnegative CHECK (stock_quantity >= 0);

ALTER TABLE public.custom_design_sizes
  DROP CONSTRAINT IF EXISTS custom_design_sizes_reserved_quantity_nonnegative;
ALTER TABLE public.custom_design_sizes
  ADD CONSTRAINT custom_design_sizes_reserved_quantity_nonnegative CHECK (reserved_quantity >= 0);

ALTER TABLE public.custom_design_sizes
  DROP CONSTRAINT IF EXISTS custom_design_sizes_low_stock_threshold_nonnegative;
ALTER TABLE public.custom_design_sizes
  ADD CONSTRAINT custom_design_sizes_low_stock_threshold_nonnegative CHECK (low_stock_threshold >= 0);

CREATE INDEX IF NOT EXISTS idx_cd_sizes_inventory_state
  ON public.custom_design_sizes(track_inventory, stock_quantity, reserved_quantity);

CREATE INDEX IF NOT EXISTS idx_cd_sizes_sku_id
  ON public.custom_design_sizes(sku_id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS custom_design_order_id UUID REFERENCES public.custom_design_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_custom_design_order_id
  ON public.order_items(custom_design_order_id);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_or_custom;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_or_custom
  CHECK (
    product_id IS NOT NULL
    OR custom_design_url IS NOT NULL
    OR custom_design_order_id IS NOT NULL
  );
