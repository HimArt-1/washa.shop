-- ═══════════════════════════════════════════════════════════
--  وشّى | نظام إشعارات لوحة الإدارة
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,  -- order_new, application_new, etc.
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- RLS: الأدمن فقط يقرأ
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins read notifications" ON admin_notifications;
CREATE POLICY "Admins read notifications" ON admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role = 'admin'
    )
  );

-- Service role يتجاوز RLS للكتابة من Server Actions
