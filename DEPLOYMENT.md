# دليل النشر للإنتاج - منصة وشّى

## المتطلبات الأساسية

### 1. المتغيرات البيئية المطلوبة

يجب إعداد جميع المتغيرات التالية في منصة النشر (Vercel/Netlify/etc):

#### Clerk (المصادقة) - **مطلوب**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxx  # Production key
CLERK_SECRET_KEY=sk_live_xxxx                    # Production key
```

#### Supabase - **مطلوب**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
```

#### Tap Payments - **الدفع الأساسي**
```env
TAP_SECRET_KEY=sk_live_xxxx
TAP_MERCHANT_ID=merchant_id_from_tap_dashboard
NEXT_PUBLIC_TAP_PUBLIC_KEY=pk_live_xxxx
TAP_CHECKOUT_ENABLED=true
TAP_TEST_CHECKOUT_ENABLED=false
NEXT_PUBLIC_APP_URL=https://washa.shop
```

للاختبار الإداري قبل الإطلاق، استخدم مفاتيح `sk_test` و`pk_test`، واترك
`TAP_CHECKOUT_ENABLED=false` مع `TAP_TEST_CHECKOUT_ENABLED=true`. عندها يظهر
Tap فقط لحسابات `admin` و`dev`.

#### Stripe (الدفع) - **اختياري**
```env
STRIPE_SECRET_KEY=sk_live_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

#### توليد الصور - **اختياري**
```env
REPLICATE_API_TOKEN=r8_xxxx
# أو
GEMINI_API_KEY=xxxx
IMAGE_PROVIDER=gemini
```

#### البريد الإلكتروني - **اختياري**
```env
RESEND_API_KEY=re_xxxx
EMAIL_FROM=وشّى <noreply@washa.shop>
ADMIN_EMAILS=orders@washa.shop,ops@washa.shop,admin@washa.shop
ADMIN_EMAIL=admin@washa.shop
```

#### Clerk Webhook - **مطلوب لمزامنة المستخدمين وتنبيهات الدخول**
```env
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxxx
```

في Clerk Dashboard أضف endpoint:
- URL: `https://washa.shop/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`, `session.created`

#### Web Push - **اختياري**
```env
VAPID_PUBLIC_KEY=xxxx
VAPID_PRIVATE_KEY=xxxx
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxx
```

#### إعدادات عامة
```env
NEXT_PUBLIC_APP_URL=https://washa.shop
```

## خطوات النشر على Vercel

### 1. إعداد المشروع
```bash
# تأكد من أن الكود محدث
git add .
git commit -m "Prepare for production"
git push
```

### 2. ربط المشروع مع Vercel
1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اضغط "Add New Project"
3. اختر المستودع (Repository)
4. في إعدادات البناء:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (افتراضي)

### 3. إضافة المتغيرات البيئية
1. في صفحة المشروع، اذهب إلى **Settings** → **Environment Variables**
2. أضف جميع المتغيرات المطلوبة من القائمة أعلاه
3. تأكد من تحديد **Production**, **Preview**, و **Development** حسب الحاجة

### 4. النشر
1. اضغط **Deploy**
2. انتظر حتى يكتمل البناء
3. تحقق من أن الموقع يعمل بشكل صحيح

## ملاحظات مهمة

### ⚠️ Clerk Keys
- **Development**: استخدم `pk_test_...` و `sk_test_...`
- **Production**: استخدم `pk_live_...` و `sk_live_...`
- تأكد من إضافة `localhost` و `washa.shop` في Clerk Dashboard → Domains
- تنبيه تسجيل الدخول يعتمد على تفعيل حدث `session.created` في Clerk Webhooks.

### ⚠️ Supabase
- تأكد من أن RLS (Row Level Security) policies معرّفة بشكل صحيح
- تحقق من أن `SUPABASE_SERVICE_ROLE_KEY` موجودة (للاستخدام في Server Actions)

### ⚠️ PWA
- Service Worker يعمل تلقائياً في Production فقط
- تأكد من وجود ملفات الأيقونات في `/public`:
  - `icon-192.png`
  - `icon-512.png`
  - `manifest.json`

### ⚠️ Stripe Webhooks
- في Stripe Dashboard، أضف webhook endpoint:
  - URL: `https://washa.shop/api/webhooks/stripe`
  - Events: `checkout.session.completed`
- استخدم `STRIPE_WEBHOOK_SECRET` من Stripe Dashboard

## التحقق بعد النشر

1. ✅ تحقق من أن الصفحة الرئيسية تعمل
2. ✅ جرب تسجيل الدخول/التسجيل
3. ✅ تحقق من أن المعرض والمتجر يعملان
4. ✅ جرب عملية شراء (اختبار)
5. ✅ تحقق من أن PWA يعمل (Install App)

## استكشاف الأخطاء

### خطأ "supabaseUrl is required"
- تأكد من إضافة `NEXT_PUBLIC_SUPABASE_URL` في Environment Variables

### خطأ Clerk Production Keys
- تأكد من استخدام Production keys (`pk_live_...`)
- تأكد من إضافة Domain في Clerk Dashboard

### Service Worker لا يعمل
- هذا طبيعي في Development
- في Production، تأكد من أن `NODE_ENV=production`

## الدعم

للمساعدة، راجع:
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Clerk Deployment Guide](https://clerk.com/docs/deployments/overview)
