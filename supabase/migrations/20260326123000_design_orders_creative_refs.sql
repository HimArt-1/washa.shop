-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Persist creative option references on design orders
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_orders
ADD COLUMN IF NOT EXISTS style_id UUID REFERENCES public.custom_design_styles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS art_style_id UUID REFERENCES public.custom_design_art_styles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS color_package_id UUID REFERENCES public.custom_design_color_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS studio_item_id UUID REFERENCES public.custom_design_studio_items(id) ON DELETE SET NULL;

WITH style_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name
    FROM public.custom_design_styles
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET style_id = s.id
FROM style_lookup AS s
WHERE o.style_id IS NULL
  AND o.style_name = s.name;

WITH art_style_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name
    FROM public.custom_design_art_styles
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET art_style_id = a.id
FROM art_style_lookup AS a
WHERE o.art_style_id IS NULL
  AND o.art_style_name = a.name;

WITH color_package_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name
    FROM public.custom_design_color_packages
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET color_package_id = c.id
FROM color_package_lookup AS c
WHERE o.color_package_id IS NULL
  AND o.color_package_name IS NOT NULL
  AND o.color_package_name = c.name;

WITH studio_item_lookup AS (
    SELECT DISTINCT ON (name)
        id,
        name
    FROM public.custom_design_studio_items
    ORDER BY name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.custom_design_orders AS o
SET studio_item_id = s.id
FROM studio_item_lookup AS s
WHERE o.studio_item_id IS NULL
  AND o.design_method = 'studio'
  AND o.text_prompt IS NOT NULL
  AND o.text_prompt = s.name;

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_style_id
ON public.custom_design_orders(style_id);

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_art_style_id
ON public.custom_design_orders(art_style_id);

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_color_package_id
ON public.custom_design_orders(color_package_id);

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_studio_item_id
ON public.custom_design_orders(studio_item_id);
