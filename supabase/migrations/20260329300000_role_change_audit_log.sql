-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Role Change Audit Log
--  سجل تدقيق غير قابل للتعديل لكل تغيير في أدوار المستخدمين
--  يُسجَّل تلقائياً عبر Trigger عند أي UPDATE على profiles.role
-- ═══════════════════════════════════════════════════════════

-- 1. جدول السجل
CREATE TABLE IF NOT EXISTS public.role_change_audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_role        TEXT,
    new_role        TEXT        NOT NULL,
    changed_by_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    context         TEXT        NOT NULL DEFAULT 'unknown',
    -- القيم المسموح بها للسياق:
    -- 'admin_action'   : تغيير يدوي من لوحة الإدارة
    -- 'webhook_created': إنشاء تلقائي عند تسجيل Clerk الأول
    -- 'bootstrap'      : ترقية أول مدير عند إعداد المنصة
    -- 'system'         : تغيير برمجي داخلي
    metadata        JSONB,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT role_audit_context_check CHECK (
        context IN ('admin_action', 'webhook_created', 'bootstrap', 'system', 'unknown')
    )
);

-- 2. فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_role_audit_profile_id
    ON public.role_change_audit_log (profile_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_audit_changed_by
    ON public.role_change_audit_log (changed_by_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_audit_changed_at
    ON public.role_change_audit_log (changed_at DESC);

-- 3. Trigger تلقائي — يُسجَّل فوراً عند أي تغيير في role
CREATE OR REPLACE FUNCTION public.trg_log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- لا نسجّل إذا لم يتغير الدور فعلاً
    IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.role_change_audit_log (
        profile_id,
        old_role,
        new_role,
        changed_by_id,
        context,
        metadata
    ) VALUES (
        NEW.id,
        OLD.role,
        NEW.role,
        NULL,   -- changed_by_id يُحدَّث لاحقاً من التطبيق إذا توفرت المعلومات
        'system',
        jsonb_build_object(
            'username',     NEW.username,
            'clerk_id',     NEW.clerk_id,
            'triggered_at', NOW()
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_role_change ON public.profiles;

CREATE TRIGGER trg_profiles_role_change
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_log_role_change();

-- 4. RLS — السجل للقراءة فقط من الإدارة، لا يُحذف أبداً
ALTER TABLE public.role_change_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
    ON public.role_change_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.clerk_id = (
                current_setting('request.jwt.claims', true)::json->>'sub'
            )
            AND profiles.role IN ('admin', 'dev')
        )
    );

-- لا توجد سياسة INSERT/UPDATE/DELETE للمستخدمين —
-- الإدراج فقط عبر الـ Trigger (SECURITY DEFINER) أو Service Role

COMMENT ON TABLE public.role_change_audit_log IS
    'سجل تدقيق غير قابل للتعديل لكل تغيير في أدوار المستخدمين.
     يُملأ تلقائياً عبر Trigger، ويُحدَّث changed_by_id و context من التطبيق.';
