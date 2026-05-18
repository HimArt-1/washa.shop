-- Move print pricing ownership from garment rows to print positions.
-- Garments keep only the base item price; each print position owns its
-- small/large print prices.

ALTER TABLE public.custom_design_positions
  ADD COLUMN IF NOT EXISTS print_position TEXT,
  ADD COLUMN IF NOT EXISTS price_large NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_small NUMERIC(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'custom_design_positions_print_position_check'
  ) THEN
    ALTER TABLE public.custom_design_positions
      ADD CONSTRAINT custom_design_positions_print_position_check
      CHECK (
        print_position IS NULL OR
        print_position IN ('chest', 'back', 'shoulder_right', 'shoulder_left')
      );
  END IF;
END $$;

UPDATE public.custom_design_positions
SET print_position = CASE
  WHEN name ILIKE '%صدر%' OR name ILIKE '%أمام%' OR name ILIKE '%امام%' OR name ILIKE '%chest%' OR name ILIKE '%front%' THEN 'chest'
  WHEN name ILIKE '%ظهر%' OR name ILIKE '%back%' THEN 'back'
  WHEN (name ILIKE '%كتف%' OR name ILIKE '%shoulder%') AND (name ILIKE '%يمين%' OR name ILIKE '%right%') THEN 'shoulder_right'
  WHEN (name ILIKE '%كتف%' OR name ILIKE '%shoulder%') AND (name ILIKE '%يسار%' OR name ILIKE '%left%') THEN 'shoulder_left'
  ELSE print_position
END
WHERE print_position IS NULL;

WITH legacy_pricing AS (
  SELECT
    COALESCE(MAX(price_chest_large), 0) AS chest_large,
    COALESCE(MAX(price_chest_small), 0) AS chest_small,
    COALESCE(MAX(price_back_large), 0) AS back_large,
    COALESCE(MAX(price_back_small), 0) AS back_small,
    COALESCE(MAX(price_shoulder_large), 0) AS shoulder_large,
    COALESCE(MAX(price_shoulder_small), 0) AS shoulder_small
  FROM public.custom_design_garments
)
UPDATE public.custom_design_positions AS p
SET
  price_large = CASE p.print_position
    WHEN 'chest' THEN COALESCE(NULLIF(p.price_large, 0), legacy_pricing.chest_large)
    WHEN 'back' THEN COALESCE(NULLIF(p.price_large, 0), legacy_pricing.back_large)
    WHEN 'shoulder_right' THEN COALESCE(NULLIF(p.price_large, 0), legacy_pricing.shoulder_large)
    WHEN 'shoulder_left' THEN COALESCE(NULLIF(p.price_large, 0), legacy_pricing.shoulder_large)
    ELSE p.price_large
  END,
  price_small = CASE p.print_position
    WHEN 'chest' THEN COALESCE(NULLIF(p.price_small, 0), legacy_pricing.chest_small)
    WHEN 'back' THEN COALESCE(NULLIF(p.price_small, 0), legacy_pricing.back_small)
    WHEN 'shoulder_right' THEN COALESCE(NULLIF(p.price_small, 0), legacy_pricing.shoulder_small)
    WHEN 'shoulder_left' THEN COALESCE(NULLIF(p.price_small, 0), legacy_pricing.shoulder_small)
    ELSE p.price_small
  END
FROM legacy_pricing
WHERE p.print_position IS NOT NULL;

NOTIFY pgrst, 'reload schema';
