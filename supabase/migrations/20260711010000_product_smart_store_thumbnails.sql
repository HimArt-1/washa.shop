-- Add nullable thumbnail metadata for product and smart-store list cards.
-- Non-destructive: no backfill, no NOT NULL constraints, no default values.

ALTER TABLE IF EXISTS public.products
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_garments
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_colors
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_styles
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_art_styles
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_positions
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_color_packages
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_studio_items
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

ALTER TABLE IF EXISTS public.custom_design_presets
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
