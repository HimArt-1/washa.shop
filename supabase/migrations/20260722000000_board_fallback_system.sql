-- WASHA board-generation fallback requests.
-- This table is intentionally isolated from the primary artwork asset graph.

CREATE TABLE public.washa_board_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID
        REFERENCES public.profiles(id) ON DELETE SET NULL,
    generation_request_id TEXT NOT NULL UNIQUE,
    prompt TEXT NOT NULL,
    generation_context JSONB NOT NULL
        CONSTRAINT washa_board_requests_generation_context_object
        CHECK (jsonb_typeof(generation_context) = 'object'),
    board_image_url TEXT,
    provider TEXT,
    generation_model TEXT,
    status TEXT NOT NULL DEFAULT 'processing'
        CONSTRAINT washa_board_requests_status_check
        CHECK (status IN ('processing', 'ready', 'failed')),
    manual_print_status TEXT NOT NULL DEFAULT 'pending'
        CONSTRAINT washa_board_requests_manual_print_status_check
        CHECK (manual_print_status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.washa_board_requests IS
    'Preview-only fallback boards that require manual print preparation.';
COMMENT ON COLUMN public.washa_board_requests.generation_context IS
    'Authoritative structured garment, placement, and requested-dimension context.';
COMMENT ON COLUMN public.washa_board_requests.board_image_url IS
    'Preliminary customer preview; never a production-ready print asset.';
COMMENT ON COLUMN public.washa_board_requests.profile_id IS
    'Owning profile when present; retained board work survives account deletion.';

CREATE INDEX idx_washa_board_requests_profile_created
    ON public.washa_board_requests(profile_id, created_at DESC);

CREATE INDEX idx_washa_board_requests_manual_status_created
    ON public.washa_board_requests(manual_print_status, created_at DESC);

CREATE TRIGGER set_washa_board_requests_updated_at
    BEFORE UPDATE ON public.washa_board_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.washa_board_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WASHA board requests owner read"
    ON public.washa_board_requests;
CREATE POLICY "WASHA board requests owner read"
    ON public.washa_board_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = washa_board_requests.profile_id
              AND p.clerk_id = (
                  COALESCE(
                      NULLIF(current_setting('request.jwt.claims', true), ''),
                      '{}'
                  )::JSONB ->> 'sub'
              )
        )
    );

NOTIFY pgrst, 'reload schema';
