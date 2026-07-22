-- WASHA AI asset pipeline v2: persist provider output before print preparation.

CREATE TABLE IF NOT EXISTS public.washa_design_source_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'washa-design-assets',
  permanent_storage_path TEXT NOT NULL UNIQUE,
  permanent_url TEXT NOT NULL,
  sha256_checksum TEXT NOT NULL CHECK (sha256_checksum ~ '^[a-f0-9]{64}$'),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  background_mode TEXT NOT NULL CHECK (background_mode IN ('transparent', 'opaque')),
  provider TEXT NOT NULL,
  generation_model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  generation_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  inspection_report JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_washa_source_assets_profile_checksum
  ON public.washa_design_source_assets(profile_id, sha256_checksum)
  WHERE profile_id IS NOT NULL;

ALTER TABLE public.washa_design_master_assets
  ADD COLUMN IF NOT EXISTS source_asset_id UUID
    REFERENCES public.washa_design_source_assets(id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS public.idx_washa_master_assets_profile_checksum;
CREATE UNIQUE INDEX IF NOT EXISTS idx_washa_master_assets_source_checksum
  ON public.washa_design_master_assets(profile_id, source_asset_id, sha256_checksum)
  WHERE profile_id IS NOT NULL AND source_asset_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_washa_legacy_master_assets_profile_checksum
  ON public.washa_design_master_assets(profile_id, sha256_checksum)
  WHERE profile_id IS NOT NULL AND source_asset_id IS NULL;

ALTER TABLE public.washa_design_requests
  ADD COLUMN IF NOT EXISTS source_asset_id UUID
    REFERENCES public.washa_design_source_assets(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS preview_kind TEXT NOT NULL DEFAULT 'mockup';

ALTER TABLE public.washa_design_requests
  DROP CONSTRAINT IF EXISTS washa_design_requests_preview_kind_check;
ALTER TABLE public.washa_design_requests
  ADD CONSTRAINT washa_design_requests_preview_kind_check
  CHECK (preview_kind IN ('mockup', 'source'));

ALTER TABLE public.washa_design_requests
  ALTER COLUMN master_asset_id DROP NOT NULL;

ALTER TABLE public.washa_design_requests
  DROP CONSTRAINT IF EXISTS washa_design_requests_mockup_source_type_check;
ALTER TABLE public.washa_design_requests
  ADD CONSTRAINT washa_design_requests_mockup_source_type_check
  CHECK (mockup_source_type IS NULL OR mockup_source_type IN ('reference', 'generated_blank_garment', 'source_preview'));

ALTER TABLE public.washa_design_requests
  DROP CONSTRAINT IF EXISTS washa_design_requests_transparency_verification_status_check;
ALTER TABLE public.washa_design_requests
  ADD CONSTRAINT washa_design_requests_transparency_verification_status_check
  CHECK (transparency_verification_status IN ('pending', 'verified', 'fallback_processed', 'failed'));

ALTER TABLE public.washa_design_requests
  DROP CONSTRAINT IF EXISTS washa_design_requests_production_readiness_status_check;
ALTER TABLE public.washa_design_requests
  ADD CONSTRAINT washa_design_requests_production_readiness_status_check
  CHECK (production_readiness_status IN ('ready', 'pending_prepress', 'blocked'));

ALTER TABLE public.washa_design_requests
  DROP CONSTRAINT IF EXISTS washa_design_requests_asset_state_check;
ALTER TABLE public.washa_design_requests
  ADD CONSTRAINT washa_design_requests_asset_state_check
  CHECK (
    production_readiness_status = 'blocked'
    OR (production_readiness_status = 'ready' AND master_asset_id IS NOT NULL)
    OR (
      production_readiness_status = 'pending_prepress'
      AND source_asset_id IS NOT NULL
      AND preview_kind = 'source'
    )
  );

ALTER TABLE public.washa_design_revisions
  ADD COLUMN IF NOT EXISTS source_asset_id UUID
    REFERENCES public.washa_design_source_assets(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_asset_path TEXT,
  ADD COLUMN IF NOT EXISTS source_sha256_checksum TEXT,
  ADD COLUMN IF NOT EXISTS production_readiness_status TEXT NOT NULL DEFAULT 'ready';

ALTER TABLE public.washa_design_revisions
  ALTER COLUMN master_asset_id DROP NOT NULL,
  ALTER COLUMN master_asset_path DROP NOT NULL,
  ALTER COLUMN master_sha256_checksum DROP NOT NULL,
  ALTER COLUMN print_asset_path DROP NOT NULL,
  ALTER COLUMN print_asset_url DROP NOT NULL;

ALTER TABLE public.washa_design_revisions
  DROP CONSTRAINT IF EXISTS washa_design_revisions_source_checksum_check,
  DROP CONSTRAINT IF EXISTS washa_design_revisions_readiness_check,
  DROP CONSTRAINT IF EXISTS washa_design_revisions_asset_state_check;

ALTER TABLE public.washa_design_revisions
  ADD CONSTRAINT washa_design_revisions_source_checksum_check
  CHECK (source_sha256_checksum IS NULL OR source_sha256_checksum ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT washa_design_revisions_readiness_check
  CHECK (production_readiness_status IN ('ready', 'pending_prepress')),
  ADD CONSTRAINT washa_design_revisions_asset_state_check
  CHECK (
    (
      production_readiness_status = 'ready'
      AND master_asset_id IS NOT NULL
      AND master_asset_path IS NOT NULL
      AND master_sha256_checksum IS NOT NULL
      AND print_asset_path IS NOT NULL
      AND print_asset_url IS NOT NULL
    )
    OR (
      production_readiness_status = 'pending_prepress'
      AND source_asset_id IS NOT NULL
      AND source_asset_path IS NOT NULL
      AND source_sha256_checksum IS NOT NULL
      AND master_asset_id IS NULL
      AND print_asset_path IS NULL
      AND print_asset_url IS NULL
    )
  );

ALTER TABLE public.custom_design_orders
  ADD COLUMN IF NOT EXISTS design_source_asset_id UUID
    REFERENCES public.washa_design_source_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_checksum TEXT;

ALTER TABLE public.custom_design_orders
  DROP CONSTRAINT IF EXISTS custom_design_orders_mockup_source_type_check,
  DROP CONSTRAINT IF EXISTS custom_design_orders_source_checksum_check,
  DROP CONSTRAINT IF EXISTS custom_design_orders_source_asset_state_check;
ALTER TABLE public.custom_design_orders
  ADD CONSTRAINT custom_design_orders_mockup_source_type_check
  CHECK (
    mockup_source_type IS NULL
    OR mockup_source_type IN ('reference', 'generated_blank_garment', 'source_preview')
  ),
  ADD CONSTRAINT custom_design_orders_source_checksum_check
  CHECK (source_checksum IS NULL OR source_checksum ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT custom_design_orders_source_asset_state_check
  CHECK (
    asset_schema_version < 2
    OR (
      design_request_id IS NOT NULL
      AND design_source_asset_id IS NOT NULL
      AND source_checksum IS NOT NULL
      AND design_revision_id IS NOT NULL
    )
  );

COMMENT ON COLUMN public.custom_design_orders.asset_schema_version IS
  '0 = legacy browser assets; 1 = immutable print master; 2 = immutable provider source with independently prepared print assets.';

-- Promote existing immutable masters into compatibility source rows. These
-- rows are explicitly marked as legacy-normalized: they preserve old orders
-- without pretending the pre-v2 pipeline retained untouched provider bytes.
INSERT INTO public.washa_design_source_assets (
  id,
  profile_id,
  storage_bucket,
  permanent_storage_path,
  permanent_url,
  sha256_checksum,
  width,
  height,
  mime_type,
  background_mode,
  provider,
  generation_model,
  prompt,
  generation_parameters,
  inspection_report,
  created_at
)
SELECT
  master.id,
  master.profile_id,
  master.storage_bucket,
  master.permanent_storage_path,
  master.permanent_url,
  master.sha256_checksum,
  master.width,
  master.height,
  master.mime_type,
  CASE
    WHEN master.transparent_pixel_ratio > 0 THEN 'transparent'
    ELSE 'opaque'
  END,
  master.provider,
  master.generation_model,
  master.prompt,
  master.generation_parameters || '{"legacy_promoted_master":true}'::JSONB,
  jsonb_build_object(
    'legacyPromotedMaster', true,
    'validationReport', master.validation_report
  ),
  master.created_at
FROM public.washa_design_master_assets AS master
ON CONFLICT DO NOTHING;

UPDATE public.washa_design_requests AS request
SET source_asset_id = source.id
FROM public.washa_design_master_assets AS master
JOIN public.washa_design_source_assets AS source
  ON source.id = master.id
WHERE request.source_asset_id IS NULL
  AND request.master_asset_id = master.id;

UPDATE public.custom_design_orders AS design_order
SET
  design_source_asset_id = source.id,
  source_checksum = source.sha256_checksum
FROM public.washa_design_master_assets AS master
JOIN public.washa_design_source_assets AS source
  ON source.id = master.id
WHERE design_order.design_source_asset_id IS NULL
  AND design_order.design_master_asset_id = master.id;

CREATE INDEX IF NOT EXISTS idx_washa_design_requests_source_asset
  ON public.washa_design_requests(source_asset_id)
  WHERE source_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_design_orders_source_asset
  ON public.custom_design_orders(design_source_asset_id)
  WHERE design_source_asset_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_washa_source_assets_immutable ON public.washa_design_source_assets;
CREATE TRIGGER trg_washa_source_assets_immutable
  BEFORE UPDATE OR DELETE ON public.washa_design_source_assets
  FOR EACH ROW EXECUTE FUNCTION public.reject_washa_immutable_asset_mutation();

ALTER TABLE public.washa_design_source_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WASHA source assets owner read" ON public.washa_design_source_assets;
CREATE POLICY "WASHA source assets owner read"
  ON public.washa_design_source_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = washa_design_source_assets.profile_id
        AND p.clerk_id = (
          COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB ->> 'sub'
        )
    )
  );

NOTIFY pgrst, 'reload schema';
