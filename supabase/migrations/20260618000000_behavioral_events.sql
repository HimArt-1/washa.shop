-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Behavioral Events Table
--  نظام تتبع سلوك المستخدم والأحداث التسويقية
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS behavioral_events (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id    text,
    user_id       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
    event_type    text        NOT NULL,
    entity_type   text,
    entity_id     text,
    metadata      jsonb       DEFAULT '{}'::jsonb,
    page_path     text,
    created_at    timestamptz DEFAULT now() NOT NULL
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_behavioral_events_session    ON behavioral_events (session_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_user       ON behavioral_events (user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_type       ON behavioral_events (event_type);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_created    ON behavioral_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_entity     ON behavioral_events (entity_type, entity_id);

-- Composite: funnel queries (type + date)
CREATE INDEX IF NOT EXISTS idx_behavioral_events_type_date  ON behavioral_events (event_type, created_at DESC);

-- ─── Row-Level Security ──────────────────────────────────────
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS entirely — used by API route & admin actions
-- Public users / anon cannot read events (privacy)
CREATE POLICY "service_role_full_access" ON behavioral_events
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ─── Comments ────────────────────────────────────────────────
COMMENT ON TABLE behavioral_events IS
    'كل حدث سلوكي يقوم به الزائر: مشاهدة منتج، إضافة للسلة، بدء الدفع، توليد تصميم AI، إلخ';

COMMENT ON COLUMN behavioral_events.event_type IS
    'product_view | add_to_cart | cart_view | checkout_start | checkout_complete | search_query | gallery_view | artwork_view | design_order_start | design_order_submit | design_ai_generate | coupon_apply | newsletter_subscribe';

COMMENT ON COLUMN behavioral_events.entity_type IS
    'product | artwork | category | coupon | design_order';

COMMENT ON COLUMN behavioral_events.metadata IS
    'بيانات إضافية مرنة: { price, title, query, position, variant, ... }';
