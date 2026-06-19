-- Optional display image for a specific product color variant.
ALTER TABLE public.product_skus
  ADD COLUMN IF NOT EXISTS color_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_product_skus_color_image
  ON public.product_skus(product_id, color_code)
  WHERE color_image_url IS NOT NULL;
