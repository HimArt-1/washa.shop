-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Persist DTF Studio design history
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dtf_design_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    garment_type TEXT NOT NULL,
    garment_color TEXT NOT NULL,
    style TEXT NOT NULL,
    technique TEXT NOT NULL,
    palette TEXT NOT NULL,
    prompt TEXT NOT NULL DEFAULT '',
    thumbnail_path TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_dtf_design_history_profile_created_at
ON public.dtf_design_history(profile_id, created_at DESC);
