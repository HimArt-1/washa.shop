-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — نظام حصص WASHA AI الهجين
--  منحة يومية مجانية (dtf_daily_quota_usage) + محفظة رصيد
--  دائم قابل للشراء (washa_ai_credit_wallet) مع سجل حركات
--  append-only للتدقيق (washa_ai_credit_ledger).
--
--  الاستهلاك ذرّي: يسحب من المجاني اليومي أولاً ثم من الرصيد
--  المدفوع، في معاملة واحدة. الشحن idempotent عبر ref_id
--  لمنع الشحن المزدوج عند تكرار الـwebhook.
-- ═══════════════════════════════════════════════════════════

-- ── المحفظة: رصيد دائم واحد لكل profile ─────────────────────
CREATE TABLE IF NOT EXISTS public.washa_ai_credit_wallet (
    profile_id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance             INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_purchased  INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
    lifetime_consumed   INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_consumed >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.washa_ai_credit_wallet ENABLE ROW LEVEL SECURITY;

-- المستخدم يقرأ محفظته فقط؛ الكتابة حصراً عبر الدوال SECURITY DEFINER.
DROP POLICY IF EXISTS "Users read own credit wallet" ON public.washa_ai_credit_wallet;
CREATE POLICY "Users read own credit wallet" ON public.washa_ai_credit_wallet
    FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

DROP POLICY IF EXISTS "Admins read all credit wallets" ON public.washa_ai_credit_wallet;
CREATE POLICY "Admins read all credit wallets" ON public.washa_ai_credit_wallet
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.clerk_id = auth.jwt() ->> 'sub'
              AND profiles.role IN ('admin', 'dev')
        )
    );

-- ── السجل: append-only لكل حركة على الرصيد ─────────────────
CREATE TABLE IF NOT EXISTS public.washa_ai_credit_ledger (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- موجب = إضافة، سالب = خصم
    delta          INTEGER NOT NULL,
    balance_after  INTEGER NOT NULL CHECK (balance_after >= 0),
    entry_type     TEXT NOT NULL CHECK (
        entry_type IN ('purchase', 'consume', 'refund', 'admin_grant', 'admin_deduct')
    ),
    reason         TEXT,
    -- ربط بمصدر خارجي: فاتورة Paylink، معرّف إداري، إلخ.
    ref_type       TEXT,
    ref_id         TEXT,
    created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata       JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_washa_credit_ledger_profile
    ON public.washa_ai_credit_ledger (profile_id, created_at DESC);

-- idempotency: لا يمكن شحن نفس الفاتورة مرتين.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_washa_credit_ledger_purchase_ref
    ON public.washa_ai_credit_ledger (ref_type, ref_id)
    WHERE entry_type = 'purchase' AND ref_id IS NOT NULL;

ALTER TABLE public.washa_ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit ledger" ON public.washa_ai_credit_ledger;
CREATE POLICY "Users read own credit ledger" ON public.washa_ai_credit_ledger
    FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

DROP POLICY IF EXISTS "Admins read all credit ledger" ON public.washa_ai_credit_ledger;
CREATE POLICY "Admins read all credit ledger" ON public.washa_ai_credit_ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.clerk_id = auth.jwt() ->> 'sub'
              AND profiles.role IN ('admin', 'dev')
        )
    );

-- ═══════════════════════════════════════════════════════════
--  الدالة الذرّية: استهلاك حصة توليد
--  المنطق: (1) جرّب المنحة اليومية المجانية، (2) وإلا اسحب من
--  الرصيد المدفوع. كل ذلك في معاملة واحدة. تُرجع المصدر لتمكين
--  الاسترجاع الصحيح عند فشل التوليد.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.consume_washa_ai_generation(
    p_profile_id  UUID,
    p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota_date  DATE := timezone('utc'::text, now())::date;
    v_free_used   INTEGER;
    v_balance     INTEGER;
BEGIN
    -- (1) محاولة المنحة اليومية المجانية (نفس منطق reserve_dtf_daily_quota)
    INSERT INTO public.dtf_daily_quota_usage (profile_id, quota_date, used_count)
    VALUES (p_profile_id, v_quota_date, 0)
    ON CONFLICT (profile_id, quota_date) DO NOTHING;

    UPDATE public.dtf_daily_quota_usage
    SET used_count = used_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id
      AND quota_date = v_quota_date
      AND used_count < p_daily_limit
    RETURNING used_count INTO v_free_used;

    IF v_free_used IS NOT NULL THEN
        SELECT balance INTO v_balance
        FROM public.washa_ai_credit_wallet
        WHERE profile_id = p_profile_id;

        RETURN jsonb_build_object(
            'granted', true,
            'source', 'free',
            'free_used', v_free_used,
            'free_remaining', GREATEST(p_daily_limit - v_free_used, 0),
            'free_limit', p_daily_limit,
            'paid_balance', COALESCE(v_balance, 0),
            'quota_date', v_quota_date
        );
    END IF;

    -- (2) نفدت المنحة المجانية — اسحب من الرصيد المدفوع بشكل ذرّي
    UPDATE public.washa_ai_credit_wallet
    SET balance = balance - 1,
        lifetime_consumed = lifetime_consumed + 1,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id
      AND balance > 0
    RETURNING balance INTO v_balance;

    IF v_balance IS NOT NULL THEN
        INSERT INTO public.washa_ai_credit_ledger
            (profile_id, delta, balance_after, entry_type, reason, ref_type)
        VALUES
            (p_profile_id, -1, v_balance, 'consume', 'generation', 'washa_ai_generation');

        RETURN jsonb_build_object(
            'granted', true,
            'source', 'paid',
            'free_used', p_daily_limit,
            'free_remaining', 0,
            'free_limit', p_daily_limit,
            'paid_balance', v_balance,
            'quota_date', v_quota_date
        );
    END IF;

    -- (3) لا مجاني ولا رصيد
    SELECT balance INTO v_balance
    FROM public.washa_ai_credit_wallet
    WHERE profile_id = p_profile_id;

    RETURN jsonb_build_object(
        'granted', false,
        'source', 'none',
        'free_used', p_daily_limit,
        'free_remaining', 0,
        'free_limit', p_daily_limit,
        'paid_balance', COALESCE(v_balance, 0),
        'quota_date', v_quota_date
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════
--  استرجاع حصة عند فشل التوليد بعد الاستهلاك.
--  يعكس المصدر الصحيح الذي أُرجِع من consume.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.refund_washa_ai_generation(
    p_profile_id  UUID,
    p_source      TEXT,
    p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota_date DATE := timezone('utc'::text, now())::date;
    v_balance    INTEGER;
    v_free_used  INTEGER;
BEGIN
    IF p_source = 'free' THEN
        UPDATE public.dtf_daily_quota_usage
        SET used_count = GREATEST(used_count - 1, 0),
            updated_at = timezone('utc'::text, now())
        WHERE profile_id = p_profile_id
          AND quota_date = v_quota_date
          AND used_count > 0
        RETURNING used_count INTO v_free_used;

        RETURN jsonb_build_object('released', v_free_used IS NOT NULL, 'source', 'free');
    END IF;

    IF p_source = 'paid' THEN
        UPDATE public.washa_ai_credit_wallet
        SET balance = balance + 1,
            lifetime_consumed = GREATEST(lifetime_consumed - 1, 0),
            updated_at = timezone('utc'::text, now())
        WHERE profile_id = p_profile_id
        RETURNING balance INTO v_balance;

        IF v_balance IS NOT NULL THEN
            INSERT INTO public.washa_ai_credit_ledger
                (profile_id, delta, balance_after, entry_type, reason, ref_type)
            VALUES
                (p_profile_id, 1, v_balance, 'refund', 'generation_failed', 'washa_ai_generation');
        END IF;

        RETURN jsonb_build_object('released', v_balance IS NOT NULL, 'source', 'paid', 'paid_balance', COALESCE(v_balance, 0));
    END IF;

    RETURN jsonb_build_object('released', false, 'source', p_source);
END;
$$;

-- ═══════════════════════════════════════════════════════════
--  شحن/تعديل الرصيد (شراء أو منح إداري) — idempotent للشراء.
--  ينشئ المحفظة إن لم تكن موجودة، يحدّث الرصيد، ويقيّد الحركة.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.credit_washa_ai_wallet(
    p_profile_id UUID,
    p_amount     INTEGER,
    p_entry_type TEXT,
    p_reason     TEXT DEFAULT NULL,
    p_ref_type   TEXT DEFAULT NULL,
    p_ref_id     TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_metadata   JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance   INTEGER;
    v_existing  INTEGER;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('credited', false, 'error', 'amount_must_be_positive');
    END IF;

    IF p_entry_type NOT IN ('purchase', 'admin_grant') THEN
        RETURN jsonb_build_object('credited', false, 'error', 'invalid_entry_type');
    END IF;

    -- idempotency: هل شُحنت هذه الفاتورة من قبل؟
    IF p_entry_type = 'purchase' AND p_ref_id IS NOT NULL THEN
        SELECT balance_after INTO v_existing
        FROM public.washa_ai_credit_ledger
        WHERE entry_type = 'purchase'
          AND ref_type = p_ref_type
          AND ref_id = p_ref_id
        LIMIT 1;

        IF v_existing IS NOT NULL THEN
            SELECT balance INTO v_balance
            FROM public.washa_ai_credit_wallet
            WHERE profile_id = p_profile_id;

            RETURN jsonb_build_object(
                'credited', false,
                'duplicate', true,
                'balance', COALESCE(v_balance, v_existing)
            );
        END IF;
    END IF;

    INSERT INTO public.washa_ai_credit_wallet (profile_id, balance, lifetime_purchased)
    VALUES (
        p_profile_id,
        p_amount,
        CASE WHEN p_entry_type = 'purchase' THEN p_amount ELSE 0 END
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET balance = washa_ai_credit_wallet.balance + p_amount,
        lifetime_purchased = washa_ai_credit_wallet.lifetime_purchased
            + CASE WHEN p_entry_type = 'purchase' THEN p_amount ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    RETURNING balance INTO v_balance;

    INSERT INTO public.washa_ai_credit_ledger
        (profile_id, delta, balance_after, entry_type, reason, ref_type, ref_id, created_by, metadata)
    VALUES
        (p_profile_id, p_amount, v_balance, p_entry_type, p_reason, p_ref_type, p_ref_id, p_created_by, p_metadata);

    RETURN jsonb_build_object('credited', true, 'balance', v_balance, 'amount', p_amount);
END;
$$;

COMMENT ON TABLE public.washa_ai_credit_wallet IS
    'محفظة رصيد WASHA AI الدائم لكل profile — يُستهلك بعد نفاد المنحة اليومية المجانية.';
COMMENT ON TABLE public.washa_ai_credit_ledger IS
    'سجل append-only لكل حركة رصيد WASHA AI (شراء/استهلاك/استرجاع/منح إداري) للتدقيق والمحاسبة.';
COMMENT ON FUNCTION public.consume_washa_ai_generation(UUID, INTEGER) IS
    'يستهلك حصة توليد ذرّياً: المجاني اليومي أولاً ثم الرصيد المدفوع. يُرجع granted/source/free_*/paid_balance.';
COMMENT ON FUNCTION public.refund_washa_ai_generation(UUID, TEXT, INTEGER) IS
    'يعيد حصة توليد للمصدر الصحيح (free/paid) عند فشل التوليد بعد الاستهلاك.';
COMMENT ON FUNCTION public.credit_washa_ai_wallet(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) IS
    'يشحن رصيد المحفظة (شراء أو منح إداري) بشكل idempotent عبر (ref_type, ref_id) للشراء.';
