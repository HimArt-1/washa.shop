-- Preserve SKU history while allowing product variant matrices to hide retired variants.
ALTER TABLE public.product_skus
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_product_skus_active_product
  ON public.product_skus(product_id, is_active);
