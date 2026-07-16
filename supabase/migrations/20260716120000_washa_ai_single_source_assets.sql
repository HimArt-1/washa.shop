-- ═════════════════════════════════════════════════════════════════════════════
-- WASHA AI — single-source artwork assets, deterministic mockups and revisions
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('washa-design-assets', 'washa-design-assets', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read WASHA design assets" ON storage.objects;

CREATE TABLE IF NOT EXISTS public.washa_design_master_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'washa-design-assets',
  permanent_storage_path TEXT NOT NULL UNIQUE,
  permanent_url TEXT NOT NULL,
  sha256_checksum TEXT NOT NULL CHECK (sha256_checksum ~ '^[a-f0-9]{64}$'),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  mime_type TEXT NOT NULL CHECK (mime_type = 'image/png'),
  alpha_channel_status TEXT NOT NULL
    CHECK (alpha_channel_status IN ('verified', 'fallback_processed', 'failed')),
  transparent_pixel_ratio NUMERIC(8, 7) NOT NULL
    CHECK (transparent_pixel_ratio >= 0 AND transparent_pixel_ratio <= 1),
  safe_padding_ratio NUMERIC(8, 7) NOT NULL
    CHECK (safe_padding_ratio >= 0 AND safe_padding_ratio <= 1),
  generation_model TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt TEXT NOT NULL,
  generation_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  validation_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  fallback_processing JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_washa_master_assets_profile_checksum
  ON public.washa_design_master_assets(profile_id, sha256_checksum)
  WHERE profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.washa_garment_mockup_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.custom_design_garments(id) ON DELETE CASCADE,
  color_id UUID REFERENCES public.custom_design_colors(id) ON DELETE CASCADE,
  color_hex TEXT,
  side TEXT NOT NULL CHECK (side IN ('front', 'back')),
  source_type TEXT NOT NULL CHECK (source_type IN ('reference', 'generated_blank_garment')),
  storage_bucket TEXT,
  storage_path TEXT,
  image_url TEXT NOT NULL,
  print_area_id TEXT NOT NULL DEFAULT 'default',
  print_area JSONB NOT NULL,
  anchor_point JSONB NOT NULL DEFAULT '{"x":0.5,"y":0.5}'::JSONB,
  perspective_transform JSONB,
  displacement_map_url TEXT,
  garment_mask_url TEXT,
  shading_map_url TEXT,
  lighting_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  colorization_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (colorization_mode IN ('none', 'verified')),
  generation_provider TEXT,
  generation_model TEXT,
  generation_prompt TEXT,
  generation_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  configuration_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_washa_garment_mockup_cache
  ON public.washa_garment_mockup_assets(
    product_id,
    COALESCE(color_id, '00000000-0000-0000-0000-000000000000'::UUID),
    side,
    source_type,
    configuration_version
  )
  WHERE is_active;

CREATE TABLE IF NOT EXISTS public.washa_design_asset_derivatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_master_asset_id UUID NOT NULL
    REFERENCES public.washa_design_master_assets(id) ON DELETE RESTRICT,
  source_checksum TEXT NOT NULL CHECK (source_checksum ~ '^[a-f0-9]{64}$'),
  derivative_sha256_checksum TEXT NOT NULL CHECK (derivative_sha256_checksum ~ '^[a-f0-9]{64}$'),
  derivative_type TEXT NOT NULL CHECK (
    derivative_type IN (
      'design_thumbnail',
      'design_preview',
      'mockup_front',
      'mockup_back',
      'print_production'
    )
  ),
  storage_bucket TEXT NOT NULL DEFAULT 'washa-design-assets',
  storage_path TEXT NOT NULL UNIQUE,
  access_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  transformation_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.washa_design_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_request_id TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  master_asset_id UUID NOT NULL
    REFERENCES public.washa_design_master_assets(id) ON DELETE RESTRICT,
  current_revision_id UUID,
  selected_product_id UUID REFERENCES public.custom_design_garments(id) ON DELETE SET NULL,
  selected_color_id UUID REFERENCES public.custom_design_colors(id) ON DELETE SET NULL,
  selected_color_hex TEXT,
  selected_side TEXT NOT NULL CHECK (selected_side IN ('front', 'back')),
  placement_data JSONB NOT NULL,
  front_preview_url TEXT,
  back_preview_url TEXT,
  mockup_source_type TEXT
    CHECK (mockup_source_type IN ('reference', 'generated_blank_garment')),
  reference_mockup_id UUID REFERENCES public.washa_garment_mockup_assets(id) ON DELETE SET NULL,
  generated_garment_mockup_id UUID REFERENCES public.washa_garment_mockup_assets(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  generation_model TEXT NOT NULL,
  provider TEXT NOT NULL,
  transparency_verification_status TEXT NOT NULL
    CHECK (transparency_verification_status IN ('verified', 'fallback_processed', 'failed')),
  production_readiness_status TEXT NOT NULL
    CHECK (production_readiness_status IN ('ready', 'blocked')),
  generation_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (generation_status IN ('processing', 'ready', 'blocked')),
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.washa_design_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_request_id UUID NOT NULL
    REFERENCES public.washa_design_requests(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  master_asset_id UUID NOT NULL
    REFERENCES public.washa_design_master_assets(id) ON DELETE RESTRICT,
  master_asset_path TEXT NOT NULL,
  master_sha256_checksum TEXT NOT NULL CHECK (master_sha256_checksum ~ '^[a-f0-9]{64}$'),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  mime_type TEXT NOT NULL CHECK (mime_type = 'image/png'),
  transparency_status TEXT NOT NULL,
  prompt TEXT NOT NULL,
  generation_model TEXT NOT NULL,
  provider TEXT NOT NULL,
  generation_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  product_variant JSONB NOT NULL,
  garment_color JSONB NOT NULL,
  selected_side TEXT NOT NULL CHECK (selected_side IN ('front', 'back')),
  placement_transform JSONB NOT NULL,
  print_dimensions JSONB NOT NULL,
  reference_mockup_id UUID REFERENCES public.washa_garment_mockup_assets(id) ON DELETE SET NULL,
  generated_blank_garment_mockup_id UUID REFERENCES public.washa_garment_mockup_assets(id) ON DELETE SET NULL,
  customer_preview_urls JSONB NOT NULL DEFAULT '{}'::JSONB,
  print_asset_path TEXT NOT NULL,
  print_asset_url TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(design_request_id, revision_number)
);

ALTER TABLE public.washa_design_requests
  DROP CONSTRAINT IF EXISTS washa_design_requests_current_revision_id_fkey;
ALTER TABLE public.washa_design_requests
  ADD CONSTRAINT washa_design_requests_current_revision_id_fkey
  FOREIGN KEY (current_revision_id)
  REFERENCES public.washa_design_revisions(id)
  ON DELETE SET NULL;

ALTER TABLE public.custom_design_orders
  ADD COLUMN IF NOT EXISTS design_request_id UUID
    REFERENCES public.washa_design_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS design_master_asset_id UUID
    REFERENCES public.washa_design_master_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS design_revision_id UUID
    REFERENCES public.washa_design_revisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS master_checksum TEXT,
  ADD COLUMN IF NOT EXISTS placement_data JSONB,
  ADD COLUMN IF NOT EXISTS mockup_source_type TEXT,
  ADD COLUMN IF NOT EXISTS preview_front_url TEXT,
  ADD COLUMN IF NOT EXISTS preview_back_url TEXT,
  ADD COLUMN IF NOT EXISTS print_asset_path TEXT,
  ADD COLUMN IF NOT EXISTS asset_schema_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_readiness_status TEXT;

ALTER TABLE public.custom_design_orders
  DROP CONSTRAINT IF EXISTS custom_design_orders_mockup_source_type_check;
ALTER TABLE public.custom_design_orders
  ADD CONSTRAINT custom_design_orders_mockup_source_type_check
  CHECK (
    mockup_source_type IS NULL
    OR mockup_source_type IN ('reference', 'generated_blank_garment')
  );

COMMENT ON COLUMN public.custom_design_orders.asset_schema_version IS
  '0 = legacy independent mockup/extracted assets; 1 = immutable master/revision single-source pipeline.';

CREATE INDEX IF NOT EXISTS idx_washa_design_requests_profile_created
  ON public.washa_design_requests(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_washa_design_revisions_request
  ON public.washa_design_revisions(design_request_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_custom_design_orders_revision
  ON public.custom_design_orders(design_revision_id)
  WHERE design_revision_id IS NOT NULL;

-- Backfill exact, side-specific product imagery into the manifest without
-- changing any existing source asset. A front image never implies a back image.
INSERT INTO public.washa_garment_mockup_assets (
  product_id,
  color_id,
  color_hex,
  side,
  source_type,
  image_url,
  print_area_id,
  print_area,
  colorization_mode,
  generation_parameters
)
SELECT DISTINCT
  sizes.garment_id,
  sizes.color_id,
  colors.hex_code,
  side_values.side,
  'reference',
  CASE side_values.side
    WHEN 'front' THEN sizes.image_front_url
    ELSE sizes.image_back_url
  END,
  side_values.side || '_default',
  CASE side_values.side
    WHEN 'front' THEN '{"x":0.30,"y":0.22,"width":0.40,"height":0.46}'::JSONB
    ELSE '{"x":0.29,"y":0.20,"width":0.42,"height":0.50}'::JSONB
  END,
  'none',
  jsonb_build_object('migratedFrom', 'custom_design_sizes', 'sizeId', sizes.id)
FROM public.custom_design_sizes AS sizes
LEFT JOIN public.custom_design_colors AS colors ON colors.id = sizes.color_id
CROSS JOIN (VALUES ('front'), ('back')) AS side_values(side)
WHERE CASE side_values.side
  WHEN 'front' THEN NULLIF(btrim(sizes.image_front_url), '') IS NOT NULL
  ELSE NULLIF(btrim(sizes.image_back_url), '') IS NOT NULL
END
ON CONFLICT DO NOTHING;

INSERT INTO public.washa_garment_mockup_assets (
  product_id,
  color_id,
  color_hex,
  side,
  source_type,
  image_url,
  print_area_id,
  print_area,
  colorization_mode,
  generation_parameters
)
SELECT
  colors.garment_id,
  colors.id,
  colors.hex_code,
  'front',
  'reference',
  colors.image_url,
  'front_default',
  '{"x":0.30,"y":0.22,"width":0.40,"height":0.46}'::JSONB,
  'none',
  jsonb_build_object('migratedFrom', 'custom_design_colors')
FROM public.custom_design_colors AS colors
WHERE NULLIF(btrim(colors.image_url), '') IS NOT NULL
ON CONFLICT DO NOTHING;

-- Preserve the old garment-level AI references in the manifest as inactive
-- audit rows. They are intentionally not used until an admin links/verifies an
-- exact color; the old schema did not prove that the reference color matched.
INSERT INTO public.washa_garment_mockup_assets (
  product_id,
  color_id,
  color_hex,
  side,
  source_type,
  image_url,
  print_area_id,
  print_area,
  colorization_mode,
  generation_parameters,
  is_active
)
SELECT
  garments.id,
  NULL,
  NULL,
  side_values.side,
  'reference',
  CASE side_values.side
    WHEN 'front' THEN garments.ai_reference_front_url
    ELSE garments.ai_reference_back_url
  END,
  side_values.side || '_legacy_unverified',
  CASE side_values.side
    WHEN 'front' THEN '{"x":0.30,"y":0.22,"width":0.40,"height":0.46}'::JSONB
    ELSE '{"x":0.29,"y":0.20,"width":0.42,"height":0.50}'::JSONB
  END,
  'none',
  jsonb_build_object(
    'migratedFrom',
    'custom_design_garments',
    'requiresExactColorVerification',
    true
  ),
  FALSE
FROM public.custom_design_garments AS garments
CROSS JOIN (VALUES ('front'), ('back')) AS side_values(side)
WHERE CASE side_values.side
  WHEN 'front' THEN NULLIF(btrim(garments.ai_reference_front_url), '') IS NOT NULL
  ELSE NULLIF(btrim(garments.ai_reference_back_url), '') IS NOT NULL
END
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.reject_washa_immutable_asset_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; create a new revision or derivative instead', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_washa_master_assets_immutable ON public.washa_design_master_assets;
CREATE TRIGGER trg_washa_master_assets_immutable
  BEFORE UPDATE OR DELETE ON public.washa_design_master_assets
  FOR EACH ROW EXECUTE FUNCTION public.reject_washa_immutable_asset_mutation();

DROP TRIGGER IF EXISTS trg_washa_design_revisions_immutable ON public.washa_design_revisions;
CREATE TRIGGER trg_washa_design_revisions_immutable
  BEFORE UPDATE OR DELETE ON public.washa_design_revisions
  FOR EACH ROW EXECUTE FUNCTION public.reject_washa_immutable_asset_mutation();

DROP TRIGGER IF EXISTS trg_washa_derivatives_immutable ON public.washa_design_asset_derivatives;
CREATE TRIGGER trg_washa_derivatives_immutable
  BEFORE UPDATE OR DELETE ON public.washa_design_asset_derivatives
  FOR EACH ROW EXECUTE FUNCTION public.reject_washa_immutable_asset_mutation();

ALTER TABLE public.washa_design_master_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washa_garment_mockup_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washa_design_asset_derivatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washa_design_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washa_design_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WASHA garment mockup manifest public read" ON public.washa_garment_mockup_assets;
CREATE POLICY "WASHA garment mockup manifest public read"
  ON public.washa_garment_mockup_assets FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "WASHA master assets owner read" ON public.washa_design_master_assets;
CREATE POLICY "WASHA master assets owner read"
  ON public.washa_design_master_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = washa_design_master_assets.profile_id
        AND p.clerk_id = (
          COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB ->> 'sub'
        )
    )
  );

DROP POLICY IF EXISTS "WASHA derivatives owner read" ON public.washa_design_asset_derivatives;
CREATE POLICY "WASHA derivatives owner read"
  ON public.washa_design_asset_derivatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.washa_design_master_assets AS master
      JOIN public.profiles AS p ON p.id = master.profile_id
      WHERE master.id = washa_design_asset_derivatives.source_master_asset_id
        AND p.clerk_id = (
          COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB ->> 'sub'
        )
    )
  );

DROP POLICY IF EXISTS "WASHA design requests owner read" ON public.washa_design_requests;
CREATE POLICY "WASHA design requests owner read"
  ON public.washa_design_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = washa_design_requests.profile_id
        AND p.clerk_id = (
          COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB ->> 'sub'
        )
    )
  );

DROP POLICY IF EXISTS "WASHA design revisions owner read" ON public.washa_design_revisions;
CREATE POLICY "WASHA design revisions owner read"
  ON public.washa_design_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.washa_design_requests AS request
      JOIN public.profiles AS p ON p.id = request.profile_id
      WHERE request.id = washa_design_revisions.design_request_id
        AND p.clerk_id = (
          COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB ->> 'sub'
        )
    )
  );

NOTIFY pgrst, 'reload schema';
