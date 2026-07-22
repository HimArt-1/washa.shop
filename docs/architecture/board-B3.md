# Phase B3 — Telegram notification, staff queue, and operational controls

## حالة الوثيقة وبوابة الموافقة

هذه وثيقة التصميم فقط على الفرع `washa/board-B3-admin-telegram` المبني من
رأس B2 المعتمد `8e1da2a9`. لم يُكتب أي كود B3 بعد، ولم يُرسل Telegram، ولم
تُضف صفحة إدارية، ولم تتغير أي قيمة في `site_settings`. يبقى
`DEFAULT_GENERATION_MODE = "primary"` ولا يُفعّل fallback أثناء هذه المرحلة
إلا لاحقًا بقرار تشغيلي صريح من صفحة الإعدادات بعد اعتماد التنفيذ.

B3 لا يغيّر الحصة أو قرار route في B2، ولا يغيّر B1 أو provider أو التخزين أو
جدول board، ولا يمس `DesignAssetService` أو `src/lib/washa-artwork/`. بعد
تنفيذ الأجزاء الثلاثة والاختبارات سيتوقف الفرع للمراجعة النظامية B0–B3؛ لا
merge ولا تفعيل ضمن B3 نفسه.

## حقائق المستودع التي بُني عليها التصميم

- B2 يملك اللحظة الوحيدة التي أصبحت فيها نتيجة board جاهزة ومعروفة للعميل:
  بعد نجاح `generateBoard()` داخل كتلة `mode === "fallback"`. في هذه اللحظة
  يملك route أيضًا وصف العميل الخام و`generationContext` الموثق، بينما B1 لا
  يحتاج معرفة أي قناة تشغيلية.
- `src/lib/telegram-bot.ts` يقرأ أصلًا `TELEGRAM_BOT_TOKEN` و
  `TELEGRAM_CHAT_ID`، ويقدم `sendTelegramMessage()` مع حد Telegram البالغ
  4096 حرفًا ومعالجة عدم الضبط وفشل الشبكة كنتيجة `ok: false`.
- `washa_board_requests.prompt` يحفظ prompt المزود الكامل بعد ملء القالب، لا
  حقلًا منفصلًا لوصف العميل الخام. لذلك route هو المصدر الأنظف لإرسال وصف
  العميل من دون تحليل prompt المخزن.
- `generationContext` لا يحتوي `widthCm/heightCm`. الحقول ذات الصلة بالأبعاد
  هي `printSize = large | small` و`printScale`، أما قياسات B1 بالسنتيمتر فهي
  تقريبية للعرض وليست قياس إنتاج. إشعار B3 يعرض الحقول المطلوبة كما هي ولا
  يصفها بأنها أبعاد نهائية.
- جدول board يفرض `status = processing | ready | failed` و
  `manual_print_status = pending | in_progress | completed`. صف B1 الناجح
  يملك `status=ready` وWebP في `board_image_url`، أما الصف الذي أمكن وسم فشله
  فيبقى `status=failed` و`board_image_url=null`. لا يخزن schema الحالي سبب
  الفشل، لذلك B3 يعرض الفشل الموجود بأمان ولا يخترع تشخيصًا غير محفوظ.
- RLS يسمح للمالك بالقراءة فقط، ولا توجد سياسة كتابة للمتصفح. لذلك قائمة
  الموظف والتحديث الإداري يجب أن يستخدما service-role بعد تحقق التطبيق من
  دور `admin | dev`.
- `DashboardLayout` يحمي المسارات بحسب `admin-navigation.ts`. إضافة عنصر
  معرفة بأدوار `admin, dev` تجعل الوصول المباشر والملاحة متسقين، لكن كل server
  action سيعيد التحقق من الدور بصورة مستقلة.
- `updateSiteSetting()` يدعم ويطبّع أصلًا `generation_mode` و
  `quota_charging`، ويستخدم service-role بعد `requireAdmin()` الذي يسمح فقط
  لـadmin/dev. B3 لا يكرر هذا المنطق في action جديد.

## شكل الوحدات والـseams

B3 يحافظ على ثلاث وحدات مستقلة صغيرة الواجهة:

1. وحدة إشعار Telegram تأخذ ملخص board واحدًا وتعيد نتيجة best-effort. تنسيق
   الرسالة، الهروب من HTML، تقليم الوصف والمهلة تبقى داخلها.
2. وحدة server actions لقائمة الموظف تقدم عمليتين فقط: قراءة صفوف `ready` أو
   `failed` بفلتر مغلق، وتغيير `manual_print_status` للجاهزة وحدها. الصفحة
   والاختبارات تعبران نفس الـseam.
3. واجهة إعدادات محلية المسودة تستخدم action الموجود `updateSiteSetting()`؛
   لا تنشئ طبقة حفظ جديدة ولا تجمع مفتاحين مستقلين في pseudo-transaction.

بهذا لا يتعلم route شيئًا عن صيغة Telegram، ولا يتعلم المتصفح service-role أو
استعلامات Supabase، ولا تتعلم الإعدادات منطق قرار الحصة الموجود في B0/B2.

## 1. إشعار Telegram

### موضع الاستدعاء والقرار

الاستدعاء سيكون من route بعد أن يعيد `generateBoard()` نتيجة ناجحة مكتملة
تحتوي `boardRequestId` و`boardImageUrl`، وبعد تسوية نجاح claim الموجودة في
B2، وقبل إرسال HTTP 200. لا يوضع الاستدعاء داخل
`board-generation.service.ts` للأسباب التالية:

- B1 يبقى وحدة توليد نقية تملك provider/storage/persistence فقط؛
- B3 لا يعدل B1 ولا يضيف اعتمادًا تشغيليًا إلى اختبارات المزود؛
- route يملك وصف العميل الخام و`generationContext` الأصليين؛
- نجاح Telegram لا يصبح جزءًا من معنى `generateBoard({ ok: true })`؛
- primary لا يدخل كتلة fallback أصلًا، وبالتالي لا يمكن أن يرسل إشعار board.

الترتيب الدقيق داخل مسار نجاح fallback:

```text
generateBoard succeeds
  -> success telemetry (B2 كما هو)
  -> completeDtfGenerationRequest (B2 كما هو)
  -> notifyBoardRequestReady (B3، best-effort ومحدود المدة)
  -> HTTP 200 board response (B2 كما هو)
```

تسوية claim تسبق الإشعار لتقليل احتمال تكرار الرسالة إذا انقطع الطلب بعد نجاح
board. لا يضاف حقل `telegram_notified` ولا migration في B3؛ التسليم best-effort
وقد يكون at-least-once في حالة نادرة يفشل فيها تثبيت idempotency. يحتوي كل
إشعار `boardRequestId` الفريد لكي يستطيع الموظف تمييز التكرار.

### واجهة وحدة الإشعار

ملف جديد server-only:

`src/lib/board-request-telegram.ts`

```typescript
export interface BoardRequestTelegramInput {
    boardRequestId: string;
    boardImageUrl: string;
    customerDescription: string;
    generationContext: GenerationContext;
}

export type BoardRequestTelegramResult =
    | { ok: true }
    | {
        ok: false;
        reason: "not_configured" | "delivery_failed" | "timed_out";
    };

export async function notifyBoardRequestReady(
    input: BoardRequestTelegramInput
): Promise<BoardRequestTelegramResult>;
```

الوحدة تستخدم `sendTelegramMessage()` الموجود؛ وهذا هو الـadapter الإنتاجي
الذي يقرأ `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID`. الاختبار يستبدله بـmock،
ولا ينشأ استدعاء مباشر ثانٍ إلى `api.telegram.org`.

المهلة 2500ms عبر `withTimeout()`. timeout أو throw أو `{ ok: false }` يتحول
إلى نتيجة فشل مغلقة لا تُرمى إلى route. يضيف route guard أخيرًا حول الوحدة؛
إذا خرج خطأ برمجي غير متوقع يسجل trace ثم يستمر في HTTP 200. لا تنتظر واجهة
العميل Telegram بلا حد، ولا يؤدي فشله إلى release للحصة أو تغيير claim أو
وضع صف board في failed.

أسماء trace المقترحة:

- `board_telegram_notification_sent` مع `boardRequestId` فقط؛
- `board_telegram_notification_failed` مع `boardRequestId` وسبب مغلق
  `not_configured | delivery_failed | timed_out | unexpected_error`.

لا تُسجّل الرسالة أو وصف العميل أو token أو chat ID في trace.

### اعتبار تشغيلي معروف: حد المعدل

B3 يرسل رسالة مستقلة لكل طلب board ناجح. عند حركة fallback مرتفعة قد تصل
القناة إلى حد معدل Telegram وتعيد `429` أو تفشل بعض الرسائل. هذا لا يفشل طلب
العميل: يعامل كـ`delivery_failed` ويُسجّل بالـtrace المغلق أعلاه، بينما تبقى
قائمة `ready` في صفحة الإدارة مصدر العمل القابل للمراجعة حتى عند غياب
الإشعار. لا يضيف B3 queue أو retry أو batching؛ تجميع الرسائل أو إرسال ملخص
دوري تحسين مستقبلي خارج النطاق يجب تقييمه قبل تشغيل fallback بحجم مرتفع.

### محتوى الرسالة

العنوان الحرفي:

```text
⚠️ طلب احتياطي يحتاج تركيب طباعة يدوي
```

ثم الحقول بهذا الترتيب حتى لا يبتلع الوصف الحقول التشغيلية عند حد 4096:

```text
معرّف اللوحة: <boardRequestId>
القطعة: <generationContext.garmentType>
اللون: <generationContext.garmentColor>
الموضع: <printPosition بالعربية>
الأبعاد المطلوبة: <printSize بالعربية> — المقياس <printScale أو 100>%
رابط اللوحة: <boardImageUrl>
وصف العميل: <customerDescription>
```

خريطة الموضع مغلقة:

```text
chest          -> الصدر الأمامي
back           -> الظهر
shoulder_right -> الكتف الأيمن
shoulder_left  -> الكتف الأيسر
```

`printSize` يعرض `large -> كبير` و`small -> صغير`. لا تُرسل أرقام سنتيمتر
على أنها نهائية لأنها غير موجودة في `generationContext` والموظف يؤكد القياس
النهائي. يقص وصف العميل إلى حد آمن مع علامة حذف، وتُهرب كل قيم العميل عبر
`escapeAdminNotificationHtml()` قبل `parse_mode=HTML`.

الرسالة لا تحتوي profile ID أو Clerk ID أو البريد أو الهاتف أو session/trace
ID أو حالة الحصة أو provider/model أو prompt القالب الداخلي. حاجة الموظف هنا
هي تركيب اللوحة: معرّفها، مواصفات الطلب، رابطها، والوصف فقط.

## 2. صفحة الإدارة `/dashboard/board-requests`

### الملاحة والحماية

يضاف عنصر تحت مجموعة **المحتوى والتصميم** في `admin-navigation.ts`:

```text
label: طلبات اللوحات الاحتياطية
href: /dashboard/board-requests
roles: [admin, dev]
```

بذلك يخفي sidebar العنصر عن بقية الأدوار، و`canAccessAdminPath()` يمنع الوصول
المباشر. الصفحة نفسها تقرأ عبر server action يتحقق من admin/dev مجددًا؛ فلا
تعتمد حماية البيانات على layout وحده.

### server actions وservice-role

ملف جديد:

`src/app/actions/board-requests.ts`

واجهته الخارجية:

```typescript
export type BoardManualPrintFilter =
    | "all"
    | "pending"
    | "in_progress"
    | "completed";

export type BoardRequestStatusFilter = "ready" | "failed";

export async function getBoardRequests(input?: {
    status?: BoardRequestStatusFilter;
    manualPrintStatus?: BoardManualPrintFilter;
    limit?: number;
}): Promise<BoardRequestAdminRow[]>;

export async function updateBoardManualPrintStatus(input: {
    boardRequestId: string;
    manualPrintStatus: "pending" | "in_progress" | "completed";
}): Promise<{ success: true } | { success: false; error: string }>;
```

كل export يبدأ بـ`requireBoardRequestsAdmin()` على نمط
`updateSiteSetting()/requireCreditAdmin()`:

1. `getCurrentUserOrDevAdmin()`؛ الغياب يرمي `Unauthorized`.
2. client من `getSupabaseAdminClient()`؛ لا anon client.
3. قراءة profile بحسب `clerk_id`.
4. السماح فقط عندما `role` يساوي `admin` أو `dev`؛ وإلا `Forbidden` قبل أي
   قراءة أو update لجدول board.

إعادة استخدام service-role ضرورية لأن RLS الحالي owner-read-only، لكنها تبقى
خلف هذا الـseam ولا تصل إلى Client Component.

`status` يمر عبر parser مغلق ويكون `ready` عند غيابه أو عدم صلاحيته. لا تقبل
الواجهة `processing` ولا قيمة حرة. للاستعلام مساران صريحان داخل action:

مسار `ready` يطبق:

```text
status = ready
board_image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT clamp(1..100), default 50
```

وعندما الفلتر ليس `all` يضيف
`manual_print_status = <pending|in_progress|completed>`. الفلتر الافتراضي في
الصفحة `pending` لفتح طابور العمل القابل للتنفيذ، مع أزرار واضحة للكل وبقية
الحالات.

مسار `failed` يطبق:

```text
status = failed
ORDER BY created_at DESC
LIMIT clamp(1..100), default 50
```

ولا يشترط `board_image_url` لأنه يكون `null` في الفشل المعروف، ولا يطبق
`manual_print_status`: الطلب الفاشل ليس بعدُ عمل تركيب يدويًا ولا يصح أن يظهر
كـpending قابل للتقدم. `processing` لا يظهر في أي مسار حتى لو أدخل المستخدم
query يدويًا. الفصل داخل action، لا في المتصفح، يمنع توسيع الاستعلام من URL.

الاستعلام يجلب left relation محدودة من profiles:

```text
display_name, username, email, phone
```

ولا يجلب `clerk_id` أو role أو metadata. لأن `profile_id ON DELETE SET NULL`،
تتعامل النتيجة مع `profile=null` وتعرض «حساب محذوف» بدل إسقاط طلب العمل.

Action التحديث:

- يتحقق من UUID ومن enum المغلق قبل الاستعلام؛
- يحدث عمود `manual_print_status` فقط؛
- يضيف `.eq("id", boardRequestId).eq("status", "ready")` حتى لا يستطيع UI
  تحويل failed/processing إلى طابور يدوي؛
- يعتمد check constraint الموجود كدفاع قاعدة بيانات ثانٍ؛
- يعيد خطأ عامًا عند عدم وجود صف جاهز أو فشل قاعدة البيانات؛
- يستدعي `revalidatePath("/dashboard/board-requests")` عند النجاح.

لا يحدّث `status` أو `generation_context` أو `board_image_url` أو owner، ولا
ينشئ delete action في B3.

### الصفحة والـClient Component

الملفات:

- `src/app/(protected)/dashboard/board-requests/page.tsx`
- `src/app/(protected)/dashboard/board-requests/BoardRequestsClient.tsx`

الصفحة تقرأ `searchParams.status` عبر parser مغلق (`ready | failed`، الافتراضي
`ready`). في تبويب `ready` فقط تقرأ `searchParams.manual_print_status` عبر
parser مغلق (الافتراضي `pending`). ثم تستدعي `getBoardRequests()` وتمرر DTO
آمنًا إلى Client Component. تغيير التبويب أو الفلتر يحدث URL كي يبقى قابلًا
للمشاركة والرجوع، ويعيد server query بدل تحميل كل تاريخ الجدول إلى المتصفح.

يوجد أعلى الجدول تبويبان داخل الصفحة نفسها:

```text
الجاهزة (افتراضي) -> status=ready
الفاشلة            -> status=failed
```

فلتر `manual_print_status` وأزرار تغييره يظهران في تبويب الجاهزة فقط. تبويب
الفاشلة للوعي التشغيلي والتدخل البشري: يعرض شارة «فشل التوليد»، معرّف الطلب،
وقت الإنشاء، provider/model، العميل و`generationContext`، ومكان الصورة يعرض
«لم تُنتج لوحة». الصف الفاشل read-only في B3 ولا يقدم زر تحويله إلى pending
أو إعادة توليد. وبما أن B0 لا يحفظ error code/reason، تعرض الصفحة «سبب الفشل
غير محفوظ في هذا الإصدار» بدل تخمينه؛ تشخيص السبب التفصيلي يكون من traces.

كل صف/بطاقة يعرض الحقول المشتركة، ثم الحقول المناسبة لحالته:

- `boardRequestId` وتاريخ الإنشاء وحالة `ready | failed`؛
- في ready: صورة WebP مع رابط فتح اللوحة بالحجم الكامل وتنبيه «معاينة فقط»،
  و`manual_print_status`؛ وفي failed: بديل «لم تُنتج لوحة» من دون رابط؛
- بيانات العميل: الاسم/username والبريد والهاتف، أو «حساب محذوف»؛
- حقول `generationContext` كاملة: IDs إن وجدت، القطعة، اللون وhex، طريقة
  التصميم، الأسلوب، التقنية، لوحة الألوان، نص الخط، وضع الصورة المرجعية،
  الموضع، الحجم، المقياس، وإزاحتا X/Y؛
- `<details>` يعرض JSON المنسق كاملًا أيضًا، حتى لا تُخفى حقول مستقبلية لم
  تعرفها الواجهة بعد؛
- prompt التشغيلي المخزن داخل قسم audit مطوي، مع تسمية صريحة أنه prompt
  المزود بعد ملء القالب وليس بالضرورة وصف العميل الخام.

`generationContext` وprompt وبيانات العميل مدخلات غير موثوقة حتى لو كان
الموظف المشاهد موثوقًا. تعرض React القيم كعقد نصية فقط؛ لا يستخدم B3
`dangerouslySetInnerHTML` أو HTML مشتقًا من JSON. المعاينة في الخلايا تُقص
إلى 240 محرفًا مع علامة حذف، بينما يبقى المحتوى الكامل متاحًا داخل
`<details><pre>` كنص مهروب وبمساحة ذات `max-height` وscroll. رابط الصورة يقبل
`https:` بعد parsing، ويسمح بـ`http:` فقط لمضيف محلي في بيئة التطوير؛ القيمة
غير الصالحة تتحول إلى «رابط غير صالح» ولا توضع في `href/src`. بذلك لا يؤدي
وصف عميل خام إلى XSS، ولا يجعل النص الطويل الجدول غير قابل للاستخدام، مع
بقاء `generationContext` الكامل متاحًا للموظف.

أزرار `pending / in_progress / completed` تستخدم `useTransition()`. الزر
الحالي disabled، والنقر يستدعي action بالـID والحالة فقط. عند النجاح ينفذ
`router.refresh()`؛ فإذا كانت الصفحة مفلترة تختفي البطاقة التي انتقلت إلى
حالة أخرى. عند الفشل تبقى الحالة المرئية كما هي وتظهر رسالة عامة، من دون
optimistic lie أو تعديل محلي قبل تأكيد الخادم.

## 3. وضع التوليد والحصة في `SettingsClient.tsx`

### حالة المسودة

يضاف إلى `SettingsClient`:

```typescript
const [generationMode, setGenerationMode] =
    useState<GenerationMode>(settings.generation_mode);

const [quotaCharging, setQuotaCharging] =
    useState<QuotaChargingConfig>(settings.quota_charging);
```

قيم `settings` مطبعة أصلًا في `getSiteSettings()`؛ لا ينشأ normalizer ثالث في
المتصفح. يتغير `handleSave` من قبول `Record<string, any>` إلى `unknown` لأن
`generation_mode` string صالح، ثم يستمر في استدعاء `updateSiteSetting()`
وعرض toast بالطريقة الحالية.

### Toggle وضع fallback

toggle بعنوان **«وضع التوليد الاحتياطي»**:

```text
unchecked -> draft "primary"
checked   -> draft "fallback"
```

تغيير toggle لا يكتب شيئًا. زر مستقل **«حفظ وضع التوليد»** يستدعي حرفيًا:

```typescript
updateSiteSetting(
    "generation_mode",
    generationMode === "fallback" ? "fallback" : "primary"
)
```

النص التحذيري الحرفي داخل البطاقة:

```text
عند التفعيل، التوليد يتحول لمعاينة مبدئية، الطلبات تحتاج تركيب يدوي
```

الحفظ الناجح يُطبّق فورًا على route لأن قارئ الوضع uncached في B0. لذلك لا
توجد كتابة تلقائية عند فتح الصفحة أو عند تحريك toggle، ولا تُخفى خطورة
التفعيل خلف autosave.

### سياسة احتساب الحصة

checkbox بعنوان **«احتساب الحصة تلقائيًا»**، محدد افتراضيًا لأن القيمة
الافتراضية من B0 هي `{ auto: true, manual_override: null }`.

قواعد المسودة مغلقة:

1. عند تحديد auto: تصبح
   `{ auto: true, manual_override: null }`.
2. عند إلغاء auto لأول مرة، تُحفظ النية الفعالة الحالية بدل قلب الحصة صامتًا:
   - إذا كان draft الوضع `primary`: `manual_override = "enabled"`؛
   - إذا كان draft الوضع `fallback`: `manual_override = "disabled"`.
3. عندما `auto=false` فقط، يظهر toggle **«احتساب الحصة: مُفعّل/معطّل»**؛
   تشغيله يكتب `enabled` وإطفاؤه يكتب `disabled` في المسودة.
4. بعد أن تصبح السياسة manual، تغيير draft الوضع لا يغير override؛ القرار
   أصبح يدويًا صريحًا.

زر مستقل **«حفظ سياسة الحصة»** يستدعي:

```typescript
updateSiteSetting("quota_charging", {
    auto: quotaCharging.auto,
    manual_override: quotaCharging.auto
        ? null
        : quotaCharging.manual_override,
})
```

فصل زري الحفظ مقصود: المفتاحان مستقلان في قاعدة البيانات، و
`updateSiteSetting()` لا يقدم transaction متعددة المفاتيح. زر واحد يوحي
بذرية غير موجودة وقد يترك partial save إذا نجح أحد الاستدعاءين وفشل الآخر.

النص التشغيلي الحرفي:

```text
الأصل: لا تُحتسب في الوضع الاحتياطي
```

كما تعرض الواجهة ملخص القرار الفعلي للمسودة (`تُحتسب/لا تُحتسب`) باستخدام
نفس مصفوفة B0 للعرض فقط، لكن route و`shouldChargeQuota()` يبقيان المرجع
الوحيد للتنفيذ. لا تستدعي الواجهة أي reserve/release ولا تَعِد بأن الحصة
خُصمت؛ هي تحفظ السياسة فقط.

## 4. حدود الأمان والعزل

- لا migration ولا تعديل schema أو RLS في B3.
- لا تعديل `board-generation.service.ts` أو provider adapter أو B1 prompt.
- لا تغيير في ترتيب reserve/release أو response الأساسي أو board response.
- Telegram يُستدعى فقط داخل نجاح fallback، ولا يدخل catch الأساسي.
- فشل Telegram لا يغير HTTP أو الحصة أو claim أو صف board.
- صفحة الإدارة تقرأ `status=ready|failed` فقط عبر service-role بعد تحقق الدور؛
  الافتراضي ready، ولا تسمح URL بإظهار processing.
- الصفوف الفاشلة read-only؛ تحديث الحالة اليدوية مقيد قاعدةً واستعلامًا
  بالصفوف الجاهزة.
- كل server action يعيد تحقق admin/dev؛ إخفاء رابط sidebar وحده ليس حماية.
- المتصفح لا يتلقى service key ولا token/chat ID ولا Clerk ID.
- حقول العميل والسياق تعرض كنص React مهروب مع قص بصري؛ لا HTML خام ولا رابط
  صورة خارج allowlist البروتوكول والمضيف المحلي الموثق في التطوير.
- الإعدادات لا تحفظ عند render أو toggle؛ الحفظ يتطلب زرًا صريحًا.
- لا يُفعّل fallback كجزء من migration/build/test أو عند فتح صفحة Settings.

## 5. خطة الاختبار

### Telegram وroute

1. mock لـ`sendTelegramMessage()` يثبت أن الرسالة تحتوي العنوان الحرفي، ID،
   القطعة، اللون، الموضع، `printSize/printScale`، WebP URL ووصف العميل مرة.
2. مدخلات تحتوي `<`, `&`, أو HTML في الوصف/اللون تُرسل escaped ولا تستطيع
   حقن markup؛ الوصف الطويل يقص من دون حذف الحقول التشغيلية.
3. الرسالة لا تحتوي `profileId/clerkId/email/phone/quota/provider/model`.
4. `sendTelegramMessage -> { ok:false }` يرجع
   `delivery_failed/not_configured` ويُسجّل trace مغلقًا.
5. throw أو timeout لا يخرج من الوحدة.
6. route fallback الناجح مع فشل Telegram يبقى 200، يكمل claim مرة، ولا
   يستدعي release ولا يغير `quotaCharged`.
7. نجاح Telegram يستدعى مرة بعد نجاح board فقط؛ provider/board failure لا
   يرسل، و`mode=primary` يرسل صفرًا ويبقى payload الأساسي حرفيًا بلا تغيير.
8. mock يعيد rate-limit failure يثبت أنه يصنف `delivery_failed` ولا يفشل HTTP
   أو يطلق retry/رسالة ثانية داخل B3.

### صفحة الإدارة وserver actions

1. admin وdev يستطيعان list/update؛ subscriber وبقية الأدوار يحصلون
   `Forbidden` قبل أي select/update للجدول.
2. غياب/فساد status يختار `ready`، وlist query يثبت
   `.eq("status", "ready")` و`board_image_url IS NOT NULL` ويضيف manual filter
   الصحيح فقط عند اختياره.
3. اختيار `failed` يثبت `.eq("status", "failed")` من دون شرط صورة أو manual
   filter؛ processing لا يصل إلى DTO في أي تبويب.
4. update صالح يغير `manual_print_status` وحده، يقيد `status=ready`، ويعيد
   validation/revalidation الناجحين.
5. UUID أو status غير صالحين، صف غير موجود، أو خطأ Supabase لا ينتج تحديثًا
   كاذبًا ولا رسالة نجاح.
6. render فعلي للـClient يثبت أن التبويب الافتراضي هو الجاهزة ويظهر WebP،
   generationContext كاملًا، بيانات العميل، وحالة «حساب محذوف» عند profile
   null.
7. render فعلي لتبويب الفاشلة يثبت ظهور الصف بلا صورة، شارة الفشل وحدود
   التشخيص، وعدم وجود فلتر/أزرار `manual_print_status`.
8. وصف وJSON يحتويان HTML/script يعرضان كنص مهروب، المعاينة الطويلة مقصوصة
   والكامل متاح في details، وURL خارج allowlist لا يصبح `href/src`.
9. click فعلي على كل زر حالة في ready يرسل ID/enum الصحيح؛ عند النجاح
   refresh، وعند الفشل لا تتغير الشارة محليًا.
10. اختبار `admin-navigation` يثبت ظهور/وصول المسار لـadmin/dev فقط.

### Settings

1. render يبدأ mode وquota من props بلا أي استدعاء حفظ.
2. toggle fallback ثم زر الحفظ يستدعي
   `updateSiteSetting("generation_mode", "fallback")`؛ إطفاؤه يحفظ
   `primary`.
3. auto محدد افتراضيًا ويحفظ `{ auto:true, manual_override:null }`.
4. إلغاء auto في fallback يبدأ manual disabled، وفي primary يبدأ enabled،
   ثم toggle اليدوي يحفظ الشكل المقابل حرفيًا.
5. manual toggle غير موجود في DOM عندما auto=true.
6. فشل action يظهر خطأ ولا يدعي نجاح الحفظ.
7. اختبارات action الحالية تُستكمل لتثبت تحقق الدور لـgeneration mode وquota
   لكل server action مستدعى من الواجهة.

### بوابة التحقق

بعد موافقة التنفيذ فقط:

```text
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
```

كما يُفحص diff من رأس B2 للتأكد من صفر تغييرات في B1 والمسار الأساسي، وأن
`generation_mode` لم يُكتب أو يُفعّل أثناء الاختبار.

## 6. ملفات التنفيذ المتوقعة بعد الموافقة

- إضافة `src/lib/board-request-telegram.ts`.
- تعديل B2 route بإضافة الاستدعاء best-effort داخل نجاح fallback فقط.
- إضافة `src/app/actions/board-requests.ts`.
- إضافة صفحة وClient لـ`/dashboard/board-requests`.
- تعديل `src/lib/admin-navigation.ts` لإدراج المسار بأدوار admin/dev.
- تعديل `SettingsClient.tsx` لحالتي المسودة وزري الحفظ.
- إضافة/توسيع اختبارات Telegram، route، actions، admin UI/navigation،
  وSettings.
- تحديث build artifact الخاص بـWASHA Studio فقط إذا غيّر build hash؛ لا
  يوجد تعديل مقصود في studio نفسه ضمن B3.

لا تعديل في migrations، أو `board-generation.service.ts`، أو
`board-image-provider.adapter.ts`، أو `src/lib/washa-artwork/`، أو
`design-asset.service.ts`.

## 7. بوابة الإكمال وباب الخروج

B3 لا يعد مكتملًا حتى يثبت الاختبار أن Telegram best-effort حقًا، وأن كل
server action يرفض غير admin/dev، وأن القائمة تعرض ready افتراضيًا وتكشف
failed بالفلتر المغلق من دون منحها actions، وأن مدخل العميل يعرض بأمان، وأن
settings تحفظ الشكلين الصحيحين من دون autosave، ثم تمر بوابات
test/lint/typecheck/build.

للرجوع عن B3 قبل الدمج: يحذف استدعاء Telegram ووحدته، صفحة/actions/navigation
لطلبات board، وبطاقة الإعدادات واختباراتها. يبقى B0–B2 كما هو، ويظل default
هو primary. لا يحتاج rollback قاعدة بيانات لأن B3 لا يضيف schema ولا يكتب
إعدادًا أثناء النشر.
