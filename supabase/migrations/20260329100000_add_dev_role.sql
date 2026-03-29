-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Add 'dev' Role to Profiles
--  يضيف دور التطوير الداخلي إلى قيود الأدوار
-- ═══════════════════════════════════════════════════════════

-- 1. تحديث قيد الدور في جدول profiles
--    نسقط القيد القديم (أياً كان اسمه أو قيمه) ثم نعيد إنشاءه بالأدوار الأربعة
DO $$
BEGIN
    -- محاولة إسقاط القيد بأسماء محتملة
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_fkey;
    -- بعض الإصدارات القديمة قد تسمي القيد هكذا:
    EXECUTE (
        SELECT 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(conname)
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%IN%'
        LIMIT 1
    );
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'wushsha', 'subscriber', 'dev'));

-- 2. تحديث سياسة RLS في dtf_studio_activity_logs لتشمل 'dev'
--    (الأدمن والوشّاي والـ dev يرون جميع السجلات في الداشبورد)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins and wushsha can view all logs" ON public.dtf_studio_activity_logs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = 'dtf_studio_activity_logs'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Privileged roles can view all logs"
            ON public.dtf_studio_activity_logs FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.clerk_id = (
                        current_setting('request.jwt.claims', true)::json->>'sub'
                    )
                    AND profiles.role IN ('admin', 'wushsha', 'dev')
                )
            )
        $policy$;
    END IF;
END $$;

-- 3. تعليق توضيحي على العمود
COMMENT ON COLUMN public.profiles.role IS
    'دور المستخدم:
     subscriber = المشترك الافتراضي
     wushsha    = فنان/مصمم معتمد (يحمل wushsha_level 1-5)
     admin      = مدير النظام بصلاحيات كاملة
     dev        = حساب تطوير داخلي — يُسنَد يدوياً فقط، يتجاوز جميع حصص الاستخدام';
