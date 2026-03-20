-- ============================================================
-- WASHA | Supabase Editor Bundle
-- ============================================================
-- هذا الملف يجمع الأوامر الأساسية التي احتجناها في هذه الجولة
-- ليكون جاهزًا للّصق في Supabase SQL Editor عند الحاجة.
--
-- آمن نسبيًا لإعادة التشغيل لأنه يعتمد على:
-- - IF NOT EXISTS
-- - DROP CONSTRAINT IF EXISTS
-- - ON CONFLICT DO NOTHING
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) تنظيف الإيميلات وفهرسة النسخة الموحّدة
-- المصدر: 20260315090000_identity_email_hygiene_index.sql
-- ------------------------------------------------------------
UPDATE public.profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

CREATE INDEX IF NOT EXISTS profiles_email_normalized_idx
ON public.profiles (lower(email))
WHERE email IS NOT NULL;

-- ------------------------------------------------------------
-- 2) إضافة الجنس إلى طلبات الانضمام
-- المصدر: 20260315100000_application_gender.sql
-- ------------------------------------------------------------
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_gender_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_gender_check
CHECK (gender IN ('male', 'female') OR gender IS NULL);

-- ------------------------------------------------------------
-- 3) إضافة حقول الانضمام الاستراتيجية
-- المصدر: 20260315110000_application_join_profile_fields.sql
-- ------------------------------------------------------------
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS join_type TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_join_type_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_join_type_check
CHECK (
    join_type IN ('artist', 'designer', 'model', 'customer', 'partner')
    OR join_type IS NULL
);

-- ------------------------------------------------------------
-- 4) زرع قواعد التشغيل والتصعيد
-- المصدر: 20260315120000_operational_rules_settings.sql
-- ------------------------------------------------------------
INSERT INTO public.site_settings (key, value)
VALUES (
    'operational_rules',
    '{
      "support": {
        "slaAtRiskMin": 1,
        "slaBreachedMin": 1
      },
      "inventory": {
        "criticalStockoutsMin": 1,
        "restockPressureItemsMin": 4,
        "lowStockTotalMin": 8,
        "fulfillmentQueueCriticalMin": 1
      },
      "payments": {
        "failedPaymentsWarningMin": 3,
        "failedPaymentsCriticalMin": 5,
        "atRiskRevenueWarning": 2500,
        "atRiskRevenueCritical": 5000,
        "pendingPaymentsWarningMin": 5,
        "pendingPaymentsCriticalMin": 10,
        "outstandingRevenueWarning": 4000,
        "outstandingRevenueCritical": 9000
      },
      "orders": {
        "pendingReviewWarningMin": 8,
        "pendingReviewCriticalMin": 15,
        "fulfillmentQueueWarningMin": 12,
        "fulfillmentQueueCriticalMin": 20,
        "paymentPendingWarningMin": 8,
        "paymentPendingCriticalMin": 12
      }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

COMMIT;
