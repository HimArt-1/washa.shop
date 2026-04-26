-- ═══════════════════════════════════════════════════════════
--  وشّى | أتمتة إشعارات الطلبات اللحظية (Database Trigger)
-- ═══════════════════════════════════════════════════════════

-- (تم تفعيل Realtime على جدول admin_notifications مسبقاً)

-- إنشاء الدالة المسؤولة عن بناء وإرسال الإشعار عند كل طلب جديد
CREATE OR REPLACE FUNCTION public.handle_new_order_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_msg TEXT;
    notification_cat TEXT;
    notification_sev TEXT;
    is_booth BOOLEAN;
BEGIN
    -- التحقق مما إذا كان الطلب من نقطة البيع (البوث)
    is_booth := (NEW.notes ILIKE '%Booth POS%');

    IF is_booth THEN
        notification_title := 'طلب مبيعات ميدانية (POS) 🟢';
        notification_msg := 'تم تسجيل طلب بيع من البوث برقم ' || NEW.id || '.';
        notification_cat := 'orders';
        notification_sev := 'info'; -- أو warning لتمييزه
    ELSE
        notification_title := 'طلب جديد 🛍️';
        notification_msg := 'تم استلام طلب جديد عبر المتجر الإلكتروني برقم ' || NEW.id || '.';
        notification_cat := 'orders';
        notification_sev := 'info';
    END IF;

    INSERT INTO public.admin_notifications (
        type,
        title,
        message,
        link,
        metadata,
        category,
        severity
    ) VALUES (
        'order_new',
        notification_title,
        notification_msg,
        '/admin/orders/' || NEW.id,
        jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'is_booth', is_booth),
        notification_cat,
        notification_sev
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الزناد (Trigger) على جدول orders
DROP TRIGGER IF EXISTS on_order_created_notification ON public.orders;
CREATE TRIGGER on_order_created_notification
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_order_notification();
