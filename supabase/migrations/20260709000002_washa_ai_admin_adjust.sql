-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — تعديل إداري ذرّي لرصيد WASHA AI
--  منح (delta موجب) أو خصم (delta سالب، مع تصفير عند الحد)،
--  ويقيّد الحركة في الـledger. يُستدعى من إجراءات الأدمن فقط.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_adjust_washa_ai_wallet(
    p_profile_id UUID,
    p_delta      INTEGER,
    p_reason     TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prev    INTEGER;
    v_balance INTEGER;
    v_applied INTEGER;
BEGIN
    IF p_delta = 0 THEN
        RETURN jsonb_build_object('adjusted', false, 'error', 'delta_must_be_nonzero');
    END IF;

    IF p_delta > 0 THEN
        INSERT INTO public.washa_ai_credit_wallet (profile_id, balance)
        VALUES (p_profile_id, p_delta)
        ON CONFLICT (profile_id) DO UPDATE
        SET balance = washa_ai_credit_wallet.balance + p_delta,
            updated_at = timezone('utc'::text, now())
        RETURNING balance INTO v_balance;

        INSERT INTO public.washa_ai_credit_ledger
            (profile_id, delta, balance_after, entry_type, reason, ref_type, created_by)
        VALUES
            (p_profile_id, p_delta, v_balance, 'admin_grant', p_reason, 'admin', p_created_by);

        RETURN jsonb_build_object('adjusted', true, 'delta', p_delta, 'balance', v_balance);
    END IF;

    -- خصم: لا ينزل تحت الصفر — نخصم المتاح فقط.
    SELECT balance INTO v_prev
    FROM public.washa_ai_credit_wallet
    WHERE profile_id = p_profile_id
    FOR UPDATE;

    IF v_prev IS NULL THEN
        RETURN jsonb_build_object('adjusted', false, 'error', 'wallet_not_found', 'balance', 0);
    END IF;

    v_balance := GREATEST(v_prev + p_delta, 0);
    v_applied := v_balance - v_prev; -- المقدار المخصوم فعلياً (سالب)

    IF v_applied = 0 THEN
        RETURN jsonb_build_object('adjusted', false, 'error', 'nothing_to_deduct', 'balance', v_prev);
    END IF;

    UPDATE public.washa_ai_credit_wallet
    SET balance = v_balance,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id;

    INSERT INTO public.washa_ai_credit_ledger
        (profile_id, delta, balance_after, entry_type, reason, ref_type, created_by)
    VALUES
        (p_profile_id, v_applied, v_balance, 'admin_deduct', p_reason, 'admin', p_created_by);

    RETURN jsonb_build_object('adjusted', true, 'delta', v_applied, 'balance', v_balance);
END;
$$;

COMMENT ON FUNCTION public.admin_adjust_washa_ai_wallet(UUID, INTEGER, TEXT, UUID) IS
    'تعديل إداري ذرّي لرصيد WASHA AI (منح/خصم) مع تقييد الحركة في الـledger.';
