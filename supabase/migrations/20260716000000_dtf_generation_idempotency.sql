-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — DTF generation idempotency
--
--  يسجل محاولة التوليد لكل مستخدم/عملية/معرّف طلب بعقدة موزعة ذات
--  lease حقيقي، ويجعل استرجاع الحصة idempotent داخل المعاملة نفسها.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dtf_generation_requests (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operation TEXT NOT NULL,
    request_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'succeeded', 'failed', 'blocked')),
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    lease_expires_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    quota_source TEXT,
    quota_date DATE,
    quota_payload JSONB,
    quota_refunded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (profile_id, operation, request_id)
);

CREATE INDEX IF NOT EXISTS idx_dtf_generation_requests_expires_at
    ON public.dtf_generation_requests (expires_at);

ALTER TABLE public.dtf_generation_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_dtf_generation_request(
    p_profile_id UUID,
    p_operation TEXT,
    p_request_id TEXT,
    p_lease_seconds INTEGER DEFAULT 300,
    p_retention_seconds INTEGER DEFAULT 86400
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_request public.dtf_generation_requests%ROWTYPE;
    v_retry_after INTEGER;
BEGIN
    IF p_profile_id IS NULL
       OR p_operation IS NULL
       OR length(trim(p_operation)) = 0
       OR p_request_id IS NULL
       OR p_request_id !~ '^[A-Za-z0-9_-]{8,128}$'
       OR p_lease_seconds <= 0
       OR p_retention_seconds <= 0 THEN
        RAISE EXCEPTION 'invalid DTF generation idempotency claim';
    END IF;

    -- تنظيف انتهازي محدود يمنع نمو السجل بلا حد مع استمرار حركة التوليد.
    -- لا نحذف الحالات blocked ذات الحصة غير المحسومة للاحتفاظ بأثر التدقيق.
    DELETE FROM public.dtf_generation_requests
    WHERE ctid IN (
        SELECT ctid
        FROM public.dtf_generation_requests
        WHERE expires_at <= v_now
          AND (
              status IN ('succeeded', 'failed')
              OR (status = 'blocked' AND quota_refunded_at IS NOT NULL)
          )
        ORDER BY expires_at
        LIMIT 100
    );

    INSERT INTO public.dtf_generation_requests (
        profile_id,
        operation,
        request_id,
        lease_expires_at,
        expires_at
    )
    VALUES (
        p_profile_id,
        p_operation,
        p_request_id,
        v_now + make_interval(secs => p_lease_seconds),
        v_now + make_interval(secs => p_retention_seconds)
    )
    ON CONFLICT (profile_id, operation, request_id) DO NOTHING;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'claimed', true,
            'state', 'claimed',
            'retry_after_seconds', 0
        );
    END IF;

    SELECT *
    INTO v_request
    FROM public.dtf_generation_requests
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id
    FOR UPDATE;

    IF v_request.status = 'processing' AND v_request.lease_expires_at > v_now THEN
        v_retry_after := GREATEST(
            CEIL(EXTRACT(EPOCH FROM (v_request.lease_expires_at - v_now)))::INTEGER,
            1
        );
        RETURN jsonb_build_object(
            'claimed', false,
            'state', 'processing',
            'retry_after_seconds', v_retry_after
        );
    END IF;

    IF v_request.status = 'processing'
       AND v_request.quota_source IN ('free', 'paid')
       AND v_request.quota_refunded_at IS NULL THEN
        UPDATE public.dtf_generation_requests
        SET status = 'blocked',
            failed_at = v_now,
            lease_expires_at = v_now,
            expires_at = v_now + make_interval(secs => p_retention_seconds),
            updated_at = v_now
        WHERE profile_id = p_profile_id
          AND operation = p_operation
          AND request_id = p_request_id;

        RETURN jsonb_build_object(
            'claimed', false,
            'state', 'blocked',
            'retry_after_seconds', 0
        );
    END IF;

    IF v_request.status = 'succeeded' AND v_request.expires_at > v_now THEN
        RETURN jsonb_build_object(
            'claimed', false,
            'state', 'succeeded',
            'retry_after_seconds', 0
        );
    END IF;

    IF v_request.status = 'blocked' AND v_request.expires_at > v_now THEN
        RETURN jsonb_build_object(
            'claimed', false,
            'state', 'blocked',
            'retry_after_seconds', 0
        );
    END IF;

    UPDATE public.dtf_generation_requests
    SET status = 'processing',
        attempt_count = attempt_count + 1,
        lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
        expires_at = v_now + make_interval(secs => p_retention_seconds),
        quota_source = NULL,
        quota_date = NULL,
        quota_payload = NULL,
        quota_refunded_at = NULL,
        completed_at = NULL,
        failed_at = NULL,
        updated_at = v_now
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id;

    RETURN jsonb_build_object(
        'claimed', true,
        'state', 'claimed',
        'retry_after_seconds', 0
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_dtf_generation_quota_for_request(
    p_profile_id UUID,
    p_operation TEXT,
    p_request_id TEXT,
    p_daily_limit INTEGER,
    p_credits_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request public.dtf_generation_requests%ROWTYPE;
    v_payload JSONB;
    v_source TEXT;
    v_quota_date DATE;
BEGIN
    SELECT *
    INTO v_request
    FROM public.dtf_generation_requests
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.status <> 'processing' THEN
        RAISE EXCEPTION 'DTF generation request is not active';
    END IF;

    IF v_request.quota_payload IS NOT NULL THEN
        RETURN v_request.quota_payload || jsonb_build_object('idempotent_replay', true);
    END IF;

    IF p_credits_enabled THEN
        SELECT public.consume_washa_ai_generation(p_profile_id, p_daily_limit)
        INTO v_payload;
    ELSE
        SELECT public.reserve_dtf_daily_quota(p_profile_id, p_daily_limit)
        INTO v_payload;
    END IF;

    IF COALESCE((v_payload ->> 'granted')::BOOLEAN, false) THEN
        v_source := CASE
            WHEN p_credits_enabled AND v_payload ->> 'source' = 'paid' THEN 'paid'
            ELSE 'free'
        END;
        v_quota_date := NULLIF(v_payload ->> 'quota_date', '')::DATE;

        UPDATE public.dtf_generation_requests
        SET quota_source = v_source,
            quota_date = v_quota_date,
            quota_payload = v_payload,
            updated_at = timezone('utc'::text, now())
        WHERE profile_id = p_profile_id
          AND operation = p_operation
          AND request_id = p_request_id;
    END IF;

    RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dtf_generation_request_quota_state(
    p_profile_id UUID,
    p_operation TEXT,
    p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request public.dtf_generation_requests%ROWTYPE;
BEGIN
    SELECT *
    INTO v_request
    FROM public.dtf_generation_requests
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'status', v_request.status,
        'quota_source', v_request.quota_source,
        'quota_payload', v_request.quota_payload,
        'quota_refunded', v_request.quota_refunded_at IS NOT NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_dtf_generation_request(
    p_profile_id UUID,
    p_operation TEXT,
    p_request_id TEXT,
    p_retention_seconds INTEGER DEFAULT 86400
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    UPDATE public.dtf_generation_requests
    SET status = 'succeeded',
        completed_at = v_now,
        lease_expires_at = v_now,
        expires_at = v_now + make_interval(secs => p_retention_seconds),
        updated_at = v_now
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id
      AND status = 'processing';

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_dtf_generation_request(
    p_profile_id UUID,
    p_operation TEXT,
    p_request_id TEXT,
    p_block_retry BOOLEAN DEFAULT false,
    p_retention_seconds INTEGER DEFAULT 86400
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    UPDATE public.dtf_generation_requests
    SET status = CASE WHEN p_block_retry THEN 'blocked' ELSE 'failed' END,
        failed_at = v_now,
        lease_expires_at = v_now,
        expires_at = v_now + make_interval(secs => p_retention_seconds),
        updated_at = v_now
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id
      AND status = 'processing';

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_washa_ai_generation_once(
    p_profile_id UUID,
    p_operation TEXT,
    p_request_id TEXT,
    p_source TEXT,
    p_quota_date DATE,
    p_daily_limit INTEGER DEFAULT 5,
    p_retention_seconds INTEGER DEFAULT 86400
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_request public.dtf_generation_requests%ROWTYPE;
    v_balance INTEGER;
    v_free_used INTEGER;
    v_released BOOLEAN := false;
    v_effective_quota_date DATE := COALESCE(p_quota_date, timezone('utc'::text, now())::date);
BEGIN
    SELECT *
    INTO v_request
    FROM public.dtf_generation_requests
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('released', false, 'reason', 'request_missing');
    END IF;

    IF v_request.quota_refunded_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'released', true,
            'duplicate', true,
            'source', v_request.quota_source
        );
    END IF;

    IF v_request.status = 'succeeded' THEN
        RETURN jsonb_build_object('released', false, 'reason', 'request_succeeded');
    END IF;

    IF v_request.quota_source IS NOT NULL AND v_request.quota_source <> p_source THEN
        UPDATE public.dtf_generation_requests
        SET status = 'blocked',
            failed_at = v_now,
            lease_expires_at = v_now,
            expires_at = v_now + make_interval(secs => p_retention_seconds),
            updated_at = v_now
        WHERE profile_id = p_profile_id
          AND operation = p_operation
          AND request_id = p_request_id;

        RETURN jsonb_build_object('released', false, 'reason', 'source_mismatch');
    END IF;

    IF p_source = 'free' THEN
        UPDATE public.dtf_daily_quota_usage
        SET used_count = GREATEST(used_count - 1, 0),
            updated_at = v_now
        WHERE profile_id = p_profile_id
          AND quota_date = v_effective_quota_date
          AND used_count > 0
        RETURNING used_count INTO v_free_used;

        v_released := v_free_used IS NOT NULL;
    ELSIF p_source = 'paid' THEN
        UPDATE public.washa_ai_credit_wallet
        SET balance = balance + 1,
            lifetime_consumed = GREATEST(lifetime_consumed - 1, 0),
            updated_at = v_now
        WHERE profile_id = p_profile_id
        RETURNING balance INTO v_balance;

        IF v_balance IS NOT NULL THEN
            INSERT INTO public.washa_ai_credit_ledger
                (profile_id, delta, balance_after, entry_type, reason, ref_type, ref_id)
            VALUES
                (
                    p_profile_id,
                    1,
                    v_balance,
                    'refund',
                    'generation_failed',
                    'washa_ai_generation',
                    p_request_id
                );
            v_released := true;
        END IF;
    END IF;

    UPDATE public.dtf_generation_requests
    SET status = CASE WHEN v_released THEN 'failed' ELSE 'blocked' END,
        quota_source = p_source,
        quota_date = v_effective_quota_date,
        quota_refunded_at = CASE WHEN v_released THEN v_now ELSE NULL END,
        failed_at = v_now,
        lease_expires_at = v_now,
        expires_at = v_now + make_interval(secs => p_retention_seconds),
        updated_at = v_now
    WHERE profile_id = p_profile_id
      AND operation = p_operation
      AND request_id = p_request_id;

    RETURN jsonb_build_object(
        'released', v_released,
        'duplicate', false,
        'source', p_source,
        'paid_balance', COALESCE(v_balance, 0)
    );
END;
$$;

REVOKE ALL ON TABLE public.dtf_generation_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.dtf_generation_requests TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_dtf_generation_request(UUID, TEXT, TEXT, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_dtf_generation_quota_for_request(UUID, TEXT, TEXT, INTEGER, BOOLEAN)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dtf_generation_request_quota_state(UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_dtf_generation_request(UUID, TEXT, TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_dtf_generation_request(UUID, TEXT, TEXT, BOOLEAN, INTEGER)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_washa_ai_generation_once(UUID, TEXT, TEXT, TEXT, DATE, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_dtf_generation_request(UUID, TEXT, TEXT, INTEGER, INTEGER)
TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_dtf_generation_quota_for_request(UUID, TEXT, TEXT, INTEGER, BOOLEAN)
TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dtf_generation_request_quota_state(UUID, TEXT, TEXT)
TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_dtf_generation_request(UUID, TEXT, TEXT, INTEGER)
TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_dtf_generation_request(UUID, TEXT, TEXT, BOOLEAN, INTEGER)
TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_washa_ai_generation_once(UUID, TEXT, TEXT, TEXT, DATE, INTEGER, INTEGER)
TO service_role;

COMMENT ON TABLE public.dtf_generation_requests IS
    'حالة idempotency موزعة لمحاولات توليد DTF، مرتبطة بالمستخدم والعملية ومعرّف الطلب.';
COMMENT ON FUNCTION public.refund_washa_ai_generation_once(UUID, TEXT, TEXT, TEXT, DATE, INTEGER, INTEGER) IS
    'يعيد حصة محاولة توليد واحدة ذرياً وبشكل idempotent حتى عند تكرار callback.';
