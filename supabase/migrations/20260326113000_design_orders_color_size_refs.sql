-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Persist color and size references on design orders
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES public.custom_design_colors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES public.custom_design_sizes(id) ON DELETE SET NULL;

WITH garment_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name
    FROM public.custom_design_garments
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
),
color_lookup AS (
    SELECT DISTINCT ON (garment_id, name)
        id,
        garment_id,
        name
    FROM public.custom_design_colors
    ORDER BY garment_id, name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET color_id = c.id
FROM color_lookup AS c
LEFT JOIN garment_lookup AS g
    ON o.garment_id IS NULL
   AND o.garment_name = g.name
WHERE o.color_id IS NULL
  AND c.name = o.color_name
  AND c.garment_id = COALESCE(o.garment_id, g.id);

WITH garment_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name
    FROM public.custom_design_garments
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
),
resolved_orders AS (
    SELECT
        o.id,
        COALESCE(o.garment_id, g.id) AS effective_garment_id,
        o.color_id,
        o.size_name
    FROM public.custom_design_orders AS o
    LEFT JOIN garment_lookup AS g
        ON o.garment_id IS NULL
       AND o.garment_name = g.name
)
UPDATE public.custom_design_orders AS o
SET size_id = matched.id
FROM resolved_orders AS ro
JOIN LATERAL (
    SELECT s.id
    FROM public.custom_design_sizes AS s
    WHERE s.garment_id = ro.effective_garment_id
      AND s.name = ro.size_name
      AND (s.color_id IS NULL OR s.color_id = ro.color_id)
    ORDER BY
        CASE
            WHEN ro.color_id IS NOT NULL AND s.color_id = ro.color_id THEN 0
            WHEN s.color_id IS NULL THEN 1
            ELSE 2
        END,
        s.updated_at DESC NULLS LAST,
        s.created_at DESC NULLS LAST
    LIMIT 1
) AS matched ON true
WHERE o.id = ro.id
  AND o.size_id IS NULL
  AND ro.effective_garment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_color_id
ON public.custom_design_orders(color_id);

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_size_id
ON public.custom_design_orders(size_id);
