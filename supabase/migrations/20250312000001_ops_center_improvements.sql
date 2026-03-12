-- Migration: تحسينات مركز الدعم الفني
-- فهرس مركب، قيد التحقق، ووظيفة الاحتفاظ بالبيانات

-- ═══ فهرس مركب لتحسين استعلامات الزيارات حسب المسار والتاريخ ═══
CREATE INDEX IF NOT EXISTS page_visits_path_created_at_idx
    ON public.page_visits(path, created_at DESC);

-- ═══ قيد التحقق لقيم type في system_logs ═══
ALTER TABLE public.system_logs
    DROP CONSTRAINT IF EXISTS system_logs_type_check;

ALTER TABLE public.system_logs
    ADD CONSTRAINT system_logs_type_check
    CHECK (type IN ('error', 'warning', 'info', 'security'));

-- ═══ وظيفة تنظيف السجلات القديمة (للاحتفاظ بالبيانات) ═══
-- استدعاؤها يدوياً أو عبر cron job
CREATE OR REPLACE FUNCTION public.cleanup_old_ops_logs(
    page_visits_retention_days INTEGER DEFAULT 90,
    system_logs_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE(deleted_page_visits BIGINT, deleted_system_logs BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pv_count BIGINT;
    sl_count BIGINT;
BEGIN
    -- حذف الزيارات الأقدم من المدة المحددة
    WITH deleted_pv AS (
        DELETE FROM public.page_visits
        WHERE created_at < (now() - (page_visits_retention_days || ' days')::interval)
        RETURNING id
    )
    SELECT COUNT(*) INTO pv_count FROM deleted_pv;

    -- حذف سجلات النظام الأقدم من المدة المحددة
    WITH deleted_sl AS (
        DELETE FROM public.system_logs
        WHERE created_at < (now() - (system_logs_retention_days || ' days')::interval)
        RETURNING id
    )
    SELECT COUNT(*) INTO sl_count FROM deleted_sl;

    RETURN QUERY SELECT pv_count, sl_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_ops_logs IS
'تنظيف سجلات مركز الدعم الفني الأقدم من المدة المحددة. استدعاؤها يدوياً أو عبر pg_cron.';
