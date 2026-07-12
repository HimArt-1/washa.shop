-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — تأمين دوال حصص/رصيد WASHA AI
--
--  هذه الدوال تعمل SECURITY DEFINER لتجاوز RLS من الخادم فقط.
--  لذلك يجب منع استدعائها كـ RPC من anon/authenticated مباشرة،
--  وترك التنفيذ حصراً لمفتاح service_role عبر مسارات Next.js.
-- ═══════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.reserve_dtf_daily_quota(UUID, INTEGER)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.release_dtf_daily_quota(UUID, INTEGER)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_washa_ai_generation(UUID, INTEGER)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.refund_washa_ai_generation(UUID, TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.credit_washa_ai_wallet(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, JSONB)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_washa_ai_wallet(UUID, INTEGER, TEXT, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_dtf_daily_quota(UUID, INTEGER)
TO service_role;

GRANT EXECUTE ON FUNCTION public.release_dtf_daily_quota(UUID, INTEGER)
TO service_role;

GRANT EXECUTE ON FUNCTION public.consume_washa_ai_generation(UUID, INTEGER)
TO service_role;

GRANT EXECUTE ON FUNCTION public.refund_washa_ai_generation(UUID, TEXT, INTEGER)
TO service_role;

GRANT EXECUTE ON FUNCTION public.credit_washa_ai_wallet(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, JSONB)
TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_adjust_washa_ai_wallet(UUID, INTEGER, TEXT, UUID)
TO service_role;
