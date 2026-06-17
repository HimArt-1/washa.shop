-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Marketing Campaigns Log Table
--  سجل الحملات البريدية التسويقية المرسلة
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    segment_id       text        NOT NULL,
    subject          text        NOT NULL,
    recipients_count int         NOT NULL DEFAULT 0,
    failed_count     int         NOT NULL DEFAULT 0,
    sent_at          timestamptz NOT NULL DEFAULT now(),
    created_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_sent ON marketing_campaigns (sent_at DESC);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON marketing_campaigns
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE marketing_campaigns IS
    'سجل تاريخي لكل حملة بريدية تسويقية: الشريحة المستهدفة، العنوان، عدد المرسل إليهم';
