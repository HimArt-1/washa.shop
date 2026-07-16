-- Notification system v2:
-- 1. Remove the legacy order trigger that duplicates the application event.
-- 2. Track admin reads per staff profile.
-- 3. Add user notification preferences.

DROP TRIGGER IF EXISTS on_order_created_notification ON public.orders;
DROP FUNCTION IF EXISTS public.handle_new_order_notification();

CREATE TABLE IF NOT EXISTS public.admin_notification_reads (
    notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_notification_reads_profile
ON public.admin_notification_reads(profile_id, read_at DESC);

-- Preserve the legacy read state during rollout so old notifications do not
-- suddenly appear unread to every member of staff.
INSERT INTO public.admin_notification_reads (notification_id, profile_id, read_at)
SELECT n.id, p.id, COALESCE(n.created_at, now())
FROM public.admin_notifications n
CROSS JOIN public.profiles p
WHERE n.is_read = true
  AND p.role IN ('admin', 'dev', 'support_agent', 'shipping_manager', 'financial_manager')
ON CONFLICT (notification_id, profile_id) DO NOTHING;

ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read own admin notification state" ON public.admin_notification_reads;
CREATE POLICY "Staff can read own admin notification state"
ON public.admin_notification_reads FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_id
          AND p.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
          AND p.role IN ('admin', 'dev', 'support_agent', 'shipping_manager', 'financial_manager')
    )
);

CREATE OR REPLACE FUNCTION public.get_admin_unread_notification_count(
    p_profile_id UUID,
    p_severity TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)
    FROM public.admin_notifications n
    WHERE (p_severity IS NULL OR n.severity = p_severity)
      AND NOT EXISTS (
          SELECT 1
          FROM public.admin_notification_reads r
          WHERE r.notification_id = n.id
            AND r.profile_id = p_profile_id
      );
$$;

CREATE OR REPLACE FUNCTION public.mark_all_admin_notifications_read(p_profile_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_count BIGINT;
BEGIN
    INSERT INTO public.admin_notification_reads (notification_id, profile_id)
    SELECT n.id, p_profile_id
    FROM public.admin_notifications n
    ON CONFLICT (notification_id, profile_id) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_unread_notification_count(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_admin_notifications_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_unread_notification_count(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_admin_notifications_read(UUID) TO service_role;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    order_updates BOOLEAN NOT NULL DEFAULT true,
    support_replies BOOLEAN NOT NULL DEFAULT true,
    design_updates BOOLEAN NOT NULL DEFAULT true,
    artist_updates BOOLEAN NOT NULL DEFAULT true,
    marketing BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
ON public.notification_preferences
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_id
          AND p.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = profile_id
          AND p.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
);
