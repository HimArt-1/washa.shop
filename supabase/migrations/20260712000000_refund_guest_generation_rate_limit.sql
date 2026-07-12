CREATE OR REPLACE FUNCTION public.refund_rate_limit(
    p_identifier TEXT,
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
    v_hit_count INTEGER;
BEGIN
    IF p_window_seconds <= 0 THEN
        RAISE EXCEPTION 'p_window_seconds must be positive';
    END IF;

    v_window_index := floor(extract(epoch from timezone('utc'::text, now())) / p_window_seconds)::BIGINT;
    v_window_start := to_timestamp(v_window_index * p_window_seconds);

    UPDATE public.distributed_rate_limits
    SET hit_count = GREATEST(hit_count - 1, 0),
        updated_at = timezone('utc'::text, now())
    WHERE identifier = p_identifier
      AND window_start = v_window_start
      AND hit_count > 0
    RETURNING hit_count INTO v_hit_count;

    RETURN jsonb_build_object(
        'released', v_hit_count IS NOT NULL,
        'count', COALESCE(v_hit_count, 0)
    );
END;
$$;

COMMENT ON FUNCTION public.refund_rate_limit(TEXT, INTEGER) IS
    'يعيد محاولة واحدة من محدد المعدل عند فشل توليد الزائر بعد حجز الحصة.';

REVOKE EXECUTE ON FUNCTION public.refund_rate_limit(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_rate_limit(TEXT, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_rate_limit(TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_rate_limit(TEXT, INTEGER) TO service_role;
