-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Smart Store Design Intelligence
--  Metadata + Presets + Compatibility Graph
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_styles
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.custom_design_art_styles
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.custom_design_color_packages
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.custom_design_studio_items
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.custom_design_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  story TEXT,
  badge TEXT,
  image_url TEXT,
  garment_id UUID REFERENCES public.custom_design_garments(id) ON DELETE SET NULL,
  design_method TEXT CHECK (design_method IN ('from_text', 'from_image', 'studio') OR design_method IS NULL),
  style_id UUID REFERENCES public.custom_design_styles(id) ON DELETE SET NULL,
  art_style_id UUID REFERENCES public.custom_design_art_styles(id) ON DELETE SET NULL,
  color_package_id UUID REFERENCES public.custom_design_color_packages(id) ON DELETE SET NULL,
  studio_item_id UUID REFERENCES public.custom_design_studio_items(id) ON DELETE SET NULL,
  print_position TEXT CHECK (print_position IN ('chest', 'back', 'shoulder_right', 'shoulder_left') OR print_position IS NULL),
  print_size TEXT CHECK (print_size IN ('large', 'small') OR print_size IS NULL),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_presets_active_order
ON public.custom_design_presets (is_active, is_featured, sort_order);

CREATE TABLE IF NOT EXISTS public.custom_design_option_compatibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('garment', 'style', 'art_style', 'color_package', 'studio_item', 'preset')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('garment', 'style', 'art_style', 'color_package', 'studio_item', 'preset')),
  target_id UUID NOT NULL,
  relation TEXT NOT NULL DEFAULT 'recommended' CHECK (relation IN ('recommended', 'signature', 'avoid')),
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_design_option_compatibilities_unique_pair
    UNIQUE (source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_cd_compat_source
ON public.custom_design_option_compatibilities (source_type, source_id, target_type);

CREATE INDEX IF NOT EXISTS idx_cd_compat_target
ON public.custom_design_option_compatibilities (target_type, target_id, relation);

ALTER TABLE public.custom_design_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_design_option_compatibilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_design_presets_public_read" ON public.custom_design_presets;
CREATE POLICY "custom_design_presets_public_read"
  ON public.custom_design_presets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "custom_design_option_compatibilities_public_read" ON public.custom_design_option_compatibilities;
CREATE POLICY "custom_design_option_compatibilities_public_read"
  ON public.custom_design_option_compatibilities
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS set_cd_presets_updated_at ON public.custom_design_presets;
CREATE TRIGGER set_cd_presets_updated_at
BEFORE UPDATE ON public.custom_design_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_cd_option_compatibilities_updated_at ON public.custom_design_option_compatibilities;
CREATE TRIGGER set_cd_option_compatibilities_updated_at
BEFORE UPDATE ON public.custom_design_option_compatibilities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
