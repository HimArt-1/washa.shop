-- ═══════════════════════════════════════════════════════════
--  وشّى | WUSHA — اشتراكات Web Push
--  لتسجيل متصفحات المستخدمين لإرسال إشعارات
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push subscriptions readable by service" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions readable by service" ON push_subscriptions;
CREATE POLICY "Push subscriptions readable by service" ON push_subscriptions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Push subscriptions insert" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions insert" ON push_subscriptions;
CREATE POLICY "Push subscriptions insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Push subscriptions delete" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions delete" ON push_subscriptions;
CREATE POLICY "Push subscriptions delete" ON push_subscriptions FOR DELETE USING (true);
