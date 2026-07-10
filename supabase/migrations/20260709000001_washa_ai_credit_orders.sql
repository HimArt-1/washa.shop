-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — طلبات شراء رصيد WASHA AI
--  نيّة شراء تُنشأ قبل تحويل المستخدم إلى بوابة الدفع، ويُتحقق
--  منها عند العودة لمطابقة المبلغ ومنع التلاعب. الشحن الفعلي
--  للمحفظة يتم عبر credit_washa_ai_wallet (idempotent).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.washa_ai_credit_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number    TEXT NOT NULL UNIQUE,
    profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id      TEXT NOT NULL,
    credits         INTEGER NOT NULL CHECK (credits > 0),
    amount          NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency        TEXT NOT NULL DEFAULT 'SAR',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'failed', 'cancelled')
    ),
    transaction_no  TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_washa_credit_orders_profile
    ON public.washa_ai_credit_orders (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_washa_credit_orders_status
    ON public.washa_ai_credit_orders (status, created_at DESC);

ALTER TABLE public.washa_ai_credit_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit orders" ON public.washa_ai_credit_orders;
CREATE POLICY "Users read own credit orders" ON public.washa_ai_credit_orders
    FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    );

DROP POLICY IF EXISTS "Admins read all credit orders" ON public.washa_ai_credit_orders;
CREATE POLICY "Admins read all credit orders" ON public.washa_ai_credit_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.clerk_id = auth.jwt() ->> 'sub'
              AND profiles.role IN ('admin', 'dev')
        )
    );

COMMENT ON TABLE public.washa_ai_credit_orders IS
    'نيّات شراء رصيد WASHA AI — تُطابق عند العودة من Paylink قبل شحن المحفظة.';
