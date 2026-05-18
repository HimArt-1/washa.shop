-- A print-position card now represents one purchasable print option:
-- position + size + one price. The previous price_large/price_small columns
-- remain for backward compatibility and are derived from this single price.

ALTER TABLE public.custom_design_positions
  ADD COLUMN IF NOT EXISTS print_size TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'custom_design_positions_print_size_check'
  ) THEN
    ALTER TABLE public.custom_design_positions
      ADD CONSTRAINT custom_design_positions_print_size_check
      CHECK (print_size IS NULL OR print_size IN ('large', 'small'));
  END IF;
END $$;

UPDATE public.custom_design_positions
SET print_size = CASE
  WHEN name ILIKE '%صغير%' OR name ILIKE '%شعار%' OR name ILIKE '%small%' OR name ILIKE '%logo%' THEN 'small'
  WHEN name ILIKE '%كبير%' OR name ILIKE '%large%' THEN 'large'
  WHEN print_position IN ('shoulder_right', 'shoulder_left') THEN 'small'
  WHEN print_position IN ('chest', 'back') THEN 'large'
  ELSE print_size
END
WHERE print_size IS NULL;

UPDATE public.custom_design_positions
SET price = CASE print_size
  WHEN 'small' THEN COALESCE(NULLIF(price, 0), price_small, 0)
  WHEN 'large' THEN COALESCE(NULLIF(price, 0), price_large, 0)
  ELSE price
END
WHERE print_size IS NOT NULL;

UPDATE public.custom_design_positions
SET
  price_large = CASE WHEN print_size = 'large' THEN price ELSE 0 END,
  price_small = CASE WHEN print_size = 'small' THEN price ELSE 0 END
WHERE print_size IS NOT NULL;

NOTIFY pgrst, 'reload schema';
