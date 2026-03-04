# إعداد SQL Editor في Supabase

دليل تشغيل ترحيلات قاعدة البيانات وإعدادات SQL Editor.

---

## 1. الوصول إلى SQL Editor

1. ادخل إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. من القائمة الجانبية: **SQL Editor**

---

## 2. ترتيب تشغيل الترحيلات (Migrations)

شغّل الملفات بالترتيب التالي إذا لم تكن قد نُفّذت مسبقاً:

| الترتيب | الملف | الوصف |
|---------|-------|-------|
| 1 | `001_site_settings.sql` | إعدادات الموقع |
| 2 | `20240210_create_storage.sql` | bucket الأعمال الفنية (artworks) |
| 3 | `20250126000000_create_designs_bucket.sql` | bucket التصاميم (للتوليد بالذكاء الاصطناعي) |
| 4 | `20250222000000_create_products_bucket.sql` | bucket المنتجات |
| ... | (باقي الترحيلات حسب التاريخ) | |
| أخيراً | `20250227400000_tighten_social_rls.sql` | تشديد RLS للميزات الاجتماعية |

---

## 3. طريقة التشغيل

### من SQL Editor:
1. انقر **New query**
2. انسخ محتوى الملف من `supabase/migrations/`
3. الصق في المحرر
4. انقر **Run** (أو Ctrl/Cmd + Enter)

### من الطرفية (إن وُجد Supabase CLI):
```bash
supabase db push
```

---

## 4. إعدادات SQL Editor الموصى بها

| الإعداد | القيمة | ملاحظة |
|---------|--------|--------|
| Statement timeout | 60 ثانية | للاستعلامات الطويلة |
| Auto-run | معطّل | لتجنّب التشغيل التلقائي بالخطأ |

---

## 5. أخطاء شائعة وحلولها

### "policy already exists"
- استخدم `DROP POLICY IF EXISTS` قبل `CREATE POLICY`
- أو تجاهل الخطأ إن كانت السياسة موجودة مسبقاً

### "bucket already exists"
- `INSERT ... ON CONFLICT DO NOTHING` يمنع التكرار
- تجاهل الخطأ إن كان الـ bucket موجوداً

### "permission denied"
- تأكد من استخدام حساب المشروع (Owner)
- لا تستخدم اتصالات خارجية مقيدة

### "relation does not exist"
- شغّل الترحيلات بالترتيب
- تأكد من وجود جدول `profiles` و `storage.buckets`

---

## 6. التحقق من الـ buckets

بعد التشغيل، تحقق من Storage:

- **Supabase** → **Storage** → يجب أن ترى:
  - `artworks` — للأعمال الفنية
  - `designs` — لصور التصاميم المؤقتة
  - `products` — لصور المنتجات

---

## 7. ملاحظات

- احتفظ بنسخة من أي استعلام قبل تشغيله
- استخدم `BEGIN;` و `COMMIT;` للعمليات المتعددة
- للتراجع عن تغيير: استخدم `ROLLBACK;` قبل `COMMIT;`
