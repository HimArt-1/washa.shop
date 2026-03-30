-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Atomic Daily Quota for DTF Studio
--  يحوّل الحصة اليومية من عدّ لاحق في telemetry إلى حجز ذري
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dtf_daily_quota_usage (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quota_date DATE NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (profile_id, quota_date)
);

CREATE INDEX IF NOT EXISTS idx_dtf_daily_quota_usage_quota_date
    ON public.dtf_daily_quota_usage (quota_date DESC);

ALTER TABLE public.dtf_daily_quota_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_dtf_daily_quota(
    p_profile_id UUID,
    p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota_date DATE := timezone('utc'::text, now())::date;
    v_used INTEGER;
BEGIN
    INSERT INTO public.dtf_daily_quota_usage (profile_id, quota_date, used_count)
    VALUES (p_profile_id, v_quota_date, 0)
    ON CONFLICT (profile_id, quota_date) DO NOTHING;

    UPDATE public.dtf_daily_quota_usage
    SET used_count = used_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id
      AND quota_date = v_quota_date
      AND used_count < p_daily_limit
    RETURNING used_count INTO v_used;

    IF v_used IS NULL THEN
        SELECT usage.used_count
        INTO v_used
        FROM public.dtf_daily_quota_usage AS usage
        WHERE usage.profile_id = p_profile_id
          AND usage.quota_date = v_quota_date;

        RETURN jsonb_build_object(
            'granted', false,
            'remaining', GREATEST(p_daily_limit - COALESCE(v_used, p_daily_limit), 0),
            'used', COALESCE(v_used, p_daily_limit),
            'quota_date', v_quota_date
        );
    END IF;

    RETURN jsonb_build_object(
        'granted', true,
        'remaining', GREATEST(p_daily_limit - v_used, 0),
        'used', v_used,
        'quota_date', v_quota_date
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_dtf_daily_quota(
    p_profile_id UUID,
    p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota_date DATE := timezone('utc'::text, now())::date;
    v_used INTEGER;
BEGIN
    UPDATE public.dtf_daily_quota_usage
    SET used_count = GREATEST(used_count - 1, 0),
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id
      AND quota_date = v_quota_date
      AND used_count > 0
    RETURNING used_count INTO v_used;

    IF v_used IS NULL THEN
        SELECT usage.used_count
        INTO v_used
        FROM public.dtf_daily_quota_usage AS usage
        WHERE usage.profile_id = p_profile_id
          AND usage.quota_date = v_quota_date;

        RETURN jsonb_build_object(
            'released', false,
            'remaining', GREATEST(p_daily_limit - COALESCE(v_used, 0), 0),
            'used', COALESCE(v_used, 0),
            'quota_date', v_quota_date
        );
    END IF;

    RETURN jsonb_build_object(
        'released', true,
        'remaining', GREATEST(p_daily_limit - v_used, 0),
        'used', v_used,
        'quota_date', v_quota_date
    );
END;
$$;

COMMENT ON TABLE public.dtf_daily_quota_usage IS
    'عداد يومي ذري لحصة generate-mockup لكل profile داخل DTF Studio.';

COMMENT ON FUNCTION public.reserve_dtf_daily_quota(UUID, INTEGER) IS
    'يحجز نقطة من الحصة اليومية بشكل ذري ويُرجع granted/remaining/used/quota_date كـ JSONB.';

COMMENT ON FUNCTION public.release_dtf_daily_quota(UUID, INTEGER) IS
    'يعيد نقطة للحصة اليومية عند فشل التوليد بعد الحجز ويُرجع released/remaining/used/quota_date كـ JSONB.';
