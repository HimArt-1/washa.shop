-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Distributed Rate Limits
--  يوفّر rate limiting ذريًا وموزعًا عبر جميع نسخ السيرفر
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.distributed_rate_limits (
    identifier TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_distributed_rate_limits_window_start
    ON public.distributed_rate_limits (window_start DESC);

ALTER TABLE public.distributed_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
    p_identifier TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_index BIGINT;
    v_window_start TIMESTAMPTZ;
    v_reset_at TIMESTAMPTZ;
    v_hit_count INTEGER;
BEGIN
    IF p_limit <= 0 OR p_window_seconds <= 0 THEN
        RAISE EXCEPTION 'p_limit and p_window_seconds must be positive';
    END IF;

    v_window_index := floor(extract(epoch from timezone('utc'::text, now())) / p_window_seconds)::BIGINT;
    v_window_start := to_timestamp(v_window_index * p_window_seconds);
    v_reset_at := to_timestamp((v_window_index + 1) * p_window_seconds);

    INSERT INTO public.distributed_rate_limits (identifier, window_start, hit_count)
    VALUES (p_identifier, v_window_start, 0)
    ON CONFLICT (identifier, window_start) DO NOTHING;

    UPDATE public.distributed_rate_limits
    SET hit_count = hit_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE identifier = p_identifier
      AND window_start = v_window_start
      AND hit_count < p_limit
    RETURNING hit_count INTO v_hit_count;

    IF v_hit_count IS NULL THEN
        SELECT rate_limit.hit_count
        INTO v_hit_count
        FROM public.distributed_rate_limits AS rate_limit
        WHERE rate_limit.identifier = p_identifier
          AND rate_limit.window_start = v_window_start;

        RETURN jsonb_build_object(
            'success', false,
            'remaining', 0,
            'count', COALESCE(v_hit_count, p_limit),
            'reset_at', v_reset_at
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'remaining', GREATEST(p_limit - v_hit_count, 0),
        'count', v_hit_count,
        'reset_at', v_reset_at
    );
END;
$$;

COMMENT ON TABLE public.distributed_rate_limits IS
    'سجل نوافذ rate limiting موزع بين جميع نسخ الخادم.';

COMMENT ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) IS
    'يستهلك محاولة واحدة من rate limit الموزع ويُرجع success/remaining/count/reset_at كـ JSONB.';
