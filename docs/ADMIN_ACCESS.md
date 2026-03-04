# لوحة الإدارة (Dashboard)

## خطأ 500 عند الدخول للداشبورد

إذا ظهرت رسالة **"Application error: a server-side exception has occurred"** (خطأ 500):

1. **تحقق من متغيرات البيئة في Vercel:**
   - من **Vercel → Project → Settings → Environment Variables**
   - تأكد من وجود:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (أو `NEXT_PUBLIC_SUPABASE_ANON_KEY` كحد أدنى)
   - أعد النشر بعد إضافة/تعديل المتغيرات

2. **تحقق من سجلات Vercel (Logs)** لمعرفة سبب الخطأ الدقيق.

3. **تأكد أن حسابك له صلاحية admin** في جدول `profiles` (انظر القسم أدناه).

---

## الأدوار المتاحة حالياً

في جدول **`profiles`** عمود **`role`** يقبل إحدى القيم التالية فقط:

| الدور       | القيمة في DB | الوصف |
|------------|--------------|--------|
| **مسؤول**  | `admin`      | دخول لوحة الإدارة (/dashboard) وإدارة المستخدمين والطلبات والأعمال والفئات والمنتجات والإعدادات. |
| **وشّاي**  | `wushsha`    | دخول الاستوديو، رفع أعمال ومنتجات، صفحة عامة، لوحة التصميم. 5 مستويات (1–5). |
| **مشترك**  | `subscriber` | مشترك معتمد؛ الطلبات والمتجر والمعرض ولوحة التصميم. |
| **زائر**   | `guest`      | صلاحيات محدودة؛ يحتاج موافقة المسؤولين ليصبح مشتركاً. |

*(للترحيل: `artist` → `wushsha`، `buyer` → `subscriber`)*

تعيين الدور يتم من لوحة الإدارة (المستخدمون → تغيير الدور) أو يدوياً عبر SQL في Supabase.

---

## تحذير Clerk: Development keys

إذا ظهر في المتصفح:

> **Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits...**

فهذا يعني أن التطبيق يستخدم **مفاتيح تطوير** Clerk. في الإنتاج (مثلاً على Vercel):

- من [Clerk Dashboard](https://dashboard.clerk.com) → تطبيقك → **API Keys**.
- استخدم **Production** keys (وليس Development) في متغيرات البيئة للإنتاج:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`

ضع هذه القيم في **Vercel → Project → Settings → Environment Variables** (أو في `.env.production` حسب طريقة النشر).

---

## حماية مسار Seed

في الإنتاج، مسار `/api/seed` محمي. لتشغيله يدوياً:

1. أضف `SEED_SECRET` إلى متغيرات البيئة (قيمة عشوائية طويلة)
2. استدعِ: `GET /api/seed?secret=YOUR_SEED_SECRET`
   أو: `Authorization: Bearer YOUR_SEED_SECRET`

---

---

## لماذا لا تظهر واجهة الإدارة؟

واجهة الإدارة (**/dashboard**) تظهر **فقط** للمستخدمين الذين لديهم في قاعدة البيانات (Supabase) سجل في جدول **`profiles`** وقيمة **`role = 'admin'`**.

---

## السبب

في التطبيق:

1. عند الدخول إلى أي صفحة تحت **/dashboard**، يتم التحقق من المستخدم الحالي (Clerk) ثم جلب ملفه من جدول **`profiles`** باستخدام **`clerk_id`**.
2. إذا **لم يُوجَد** سجل للمستخدم، أو كان **`role`** ليس **`admin`**، يتم توجيهك إلى الصفحة الرئيسية **/** ولا تظهر واجهة الإدارة.

لذلك إن لم تظهر واجهة الإدارة فغالباً:

- **إما** لا يوجد سجل لـ `clerk_id` الخاص بك في **`profiles`** (لم يُنشأ ملفك بعد)،  
- **أو** يوجد سجل لكن **`role`** فيه **`subscriber`** أو **`wushsha`** أو **`guest`** وليس **`admin`**.

---

## الحل: تعيين مستخدم كمسؤول (admin)

### 1) معرفة `clerk_id` الخاص بك

- من [Clerk Dashboard](https://dashboard.clerk.com): اختر تطبيقك → **Users** → انقر على المستخدم → انسخ **User ID** (هذا هو `clerk_id`).  
- أو من المتصفح بعد تسجيل الدخول: افتح أدوات المطور (F12) → Console واكتب مثلاً ما يطلبه التطبيق لطباعة المستخدم (إن وُجد)، أو استخدم نفس الـ User ID من Clerk.

### 2) من Supabase: إنشاء أو تحديث الـ profile ثم جعله admin

افتح **Supabase** → مشروعك → **SQL Editor** ونفّذ أحد الأمرين:

**أ) إذا كان لديك بالفعل سجل في `profiles`** (مثلاً نفس الـ `clerk_id`):

```sql
UPDATE profiles
SET role = 'admin'
WHERE clerk_id = 'user_xxxxxxxxxxxx';   -- ضع هنا clerk_id الحقيقي من Clerk
```

**ب) إذا لم يكن لديك سجل في `profiles`** (أول مرة):

أنشئ سطراً جديداً مع **`clerk_id`** الخاص بك و**`role = 'admin'`**. استبدل القيم ثم شغّل الاستعلام:

```sql
INSERT INTO profiles (clerk_id, display_name, username, role)
VALUES (
  'user_xxxxxxxxxxxx',   -- clerk_id من Clerk Dashboard
  'المسؤول',
  'admin-' || substr(md5(random()::text), 1, 8),   -- username فريد
  'admin'
)
ON CONFLICT (clerk_id) DO UPDATE SET role = 'admin';
```

بعد التنفيذ، سجّل خروجك ثم دخولك مرة واحدة (أو حدّث الصفحة) ثم ادخل إلى **/dashboard** — يفترض أن تظهر واجهة الإدارة.

---

## ملاحظة

- إن لم يكن جدول **`profiles`** يُنشأ تلقائياً عند تسجيل المستخدمين (مثلاً عبر Clerk Webhook أو عند أول تسجيل دخول)، فكل مستخدم جديد يحتاج إما إنشاء سجل له يدوياً أو تفعيل آلية إنشاء الـ profile في التطبيق.
- يمكن لاحقاً إضافة **Clerk Webhook** عند `user.created` لإنشاء سجل في **`profiles`** تلقائياً بدور افتراضي (مثل `guest` أو `subscriber`)، ثم تعيين المسؤولين يدوياً عبر الـ SQL أعلاه.
