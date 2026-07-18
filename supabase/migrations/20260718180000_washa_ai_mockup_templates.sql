-- WASHA AI deterministic garment/color mockup templates.
-- This migration is intentionally self-contained so it can also be pasted into
-- the Supabase SQL editor without depending on earlier storage migrations.

CREATE OR REPLACE FUNCTION public.current_clerk_subject()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(
        nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', ''),
        auth.uid()::text
    );
$$;

CREATE OR REPLACE FUNCTION public.is_storage_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.clerk_id = public.current_clerk_subject()
          AND profiles.role IN ('admin', 'dev', 'manager')
    );
$$;

CREATE TABLE IF NOT EXISTS public.garment_mockup_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garment_id UUID NOT NULL
        REFERENCES public.custom_design_garments(id) ON DELETE CASCADE,
    color_id UUID
        REFERENCES public.custom_design_colors(id) ON DELETE CASCADE,
    side TEXT NOT NULL CHECK (side IN ('front', 'back')),
    base_image_url TEXT NOT NULL,
    base_image_path TEXT,
    mask_image_url TEXT,
    mask_image_path TEXT,
    overlay_image_url TEXT,
    overlay_image_path TEXT,
    print_areas JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(print_areas) = 'array'),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.garment_mockup_templates
    IS 'Admin-managed deterministic garment/color mockups with calibrated print areas.';
COMMENT ON COLUMN public.garment_mockup_templates.color_id
    IS 'Optional color-specific override; null is the garment-wide fallback.';
COMMENT ON COLUMN public.garment_mockup_templates.print_areas
    IS 'Normalized rectangles keyed by print position and size.';
COMMENT ON COLUMN public.garment_mockup_templates.mask_image_url
    IS 'Optional alpha mask limiting artwork to garment pixels.';
COMMENT ON COLUMN public.garment_mockup_templates.overlay_image_url
    IS 'Optional fabric shadow/highlight layer rendered above the artwork.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_garment_mockup_template_default_side
    ON public.garment_mockup_templates(garment_id, side)
    WHERE color_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_garment_mockup_template_color_side
    ON public.garment_mockup_templates(garment_id, color_id, side)
    WHERE color_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_garment_mockup_templates_resolution
    ON public.garment_mockup_templates(
        garment_id,
        color_id,
        side,
        is_active,
        sort_order,
        version DESC
    );

CREATE OR REPLACE FUNCTION public.set_washa_mockup_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_garment_mockup_templates
    ON public.garment_mockup_templates;
CREATE TRIGGER set_updated_at_garment_mockup_templates
    BEFORE UPDATE ON public.garment_mockup_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_washa_mockup_template_updated_at();

ALTER TABLE public.garment_mockup_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage WASHA AI mockup templates"
    ON public.garment_mockup_templates;
CREATE POLICY "Admins can manage WASHA AI mockup templates"
    ON public.garment_mockup_templates
    FOR ALL
    USING (public.is_storage_admin())
    WITH CHECK (public.is_storage_admin());
