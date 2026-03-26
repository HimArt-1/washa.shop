-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Persist garment reference and pricing snapshot on design orders
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
ADD COLUMN IF NOT EXISTS garment_id UUID REFERENCES public.custom_design_garments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

WITH garment_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name,
        COALESCE(base_price, 0) AS base_price,
        COALESCE(price_chest_large, 0) AS price_chest_large,
        COALESCE(price_chest_small, 0) AS price_chest_small,
        COALESCE(price_back_large, 0) AS price_back_large,
        COALESCE(price_back_small, 0) AS price_back_small,
        COALESCE(price_shoulder_large, 0) AS price_shoulder_large,
        COALESCE(price_shoulder_small, 0) AS price_shoulder_small
    FROM public.custom_design_garments
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET garment_id = g.id
FROM garment_lookup AS g
WHERE o.garment_id IS NULL
  AND o.garment_name = g.name;

WITH garment_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name,
        COALESCE(base_price, 0) AS base_price,
        COALESCE(price_chest_large, 0) AS price_chest_large,
        COALESCE(price_chest_small, 0) AS price_chest_small,
        COALESCE(price_back_large, 0) AS price_back_large,
        COALESCE(price_back_small, 0) AS price_back_small,
        COALESCE(price_shoulder_large, 0) AS price_shoulder_large,
        COALESCE(price_shoulder_small, 0) AS price_shoulder_small
    FROM public.custom_design_garments
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET pricing_snapshot = jsonb_build_object(
    'garment_id', COALESCE(o.garment_id, g.id),
    'garment_name', o.garment_name,
    'captured_at', o.created_at,
    'base_price', g.base_price,
    'price_chest_large', g.price_chest_large,
    'price_chest_small', g.price_chest_small,
    'price_back_large', g.price_back_large,
    'price_back_small', g.price_back_small,
    'price_shoulder_large', g.price_shoulder_large,
    'price_shoulder_small', g.price_shoulder_small
)
FROM garment_lookup AS g
WHERE o.pricing_snapshot IS NULL
  AND (
      (o.garment_id IS NOT NULL AND o.garment_id = g.id)
      OR (o.garment_id IS NULL AND o.garment_name = g.name)
  );

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_garment_id
ON public.custom_design_orders(garment_id);
