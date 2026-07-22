# Phase B2 — Route branching, quota safety, and customer disclosure

## Status and approval gate

هذه وثيقة التصميم فقط على الفرع `washa/board-B2-route-quota` المبني من
`washa/board-B1-generation` عند الالتزام `ce43c897`. لم تُضف بعد أي وصلة
تشغيل إلى `generateBoard()`، ولم يتغيّر route أو منطق الحصة أو الواجهة، ووضع
fallback غير مفعّل. يبدأ التنفيذ بعد اعتماد هذه الوثيقة فقط، ثم يتوقف B2 من
دون merge أو B3 أو تفعيل.

## نطاق B2 وحدوده

B2 يضيف adapter رفيعًا بين route الحالي ووحدة B1 العميقة، ويجعل قرار الحصة
قرارًا سابقًا لأي mutation، ثم ينقل نتيجة board إلى واجهة العميل مع إفصاح
ثابت. لا يغيّر B2 `DesignAssetService`، أو `generateIsolatedArtwork`، أو
provider/normalization/Master/Derivative/Checksum/placement في المسار الأساسي.

خارج النطاق: Telegram وصفحة الموظف وإعدادات الإدارة (B3)، أي migration، دمج
الفروع، أو تفعيل `generation_mode=fallback`.

## 1. استكشاف الحصة — الإجابات الحرفية

الأرقام التالية تخص النسخة الحالية من
`src/app/api/washa-dtf-studio/generate-mockup/route.ts` على رأس B1 قبل أي
تعديل B2:

1. **أين بالضبط تُحجز الحصة؟** يبدأ الاستدعاء الفعلي عند **السطر 448**:
   `DtfTelemetryService.reserveDailyQuota(...)`، وتمتد وسائطه حتى السطر 456.
2. **هل الحجز قبل السطر 607 أم بعده؟** الحجز **قبل** نقطة التفرّع المقترحة؛
   السطر 607 هو تعريف `generationResult`، والحجز يسبقه بـ159 سطرًا.
3. **ما دالة الحجز؟** `DtfTelemetryService.reserveDailyQuota()`.
4. **ما دالة الإعادة/الاسترداد؟**
   `DtfTelemetryService.releaseDailyQuota()`؛ يبدأ استدعاؤها في route الحالي
   عند **السطر 759** وتمتد وسائطه حتى السطر 769.
5. **متى تُخصم فعليًا في المسار الأساسي؟** `reserveDailyQuota()` ليس hold
   مؤجلًا. بعد claim الطلب، يستدعي عند وجود `requestId` الدالة الذرية
   `reserve_dtf_generation_quota_for_request` في
   `dtf-telemetry.service.ts:315`. هذه تستدعي فورًا
   `consume_washa_ai_generation` أو `reserve_dtf_daily_quota`
   (`20260716000000_dtf_generation_idempotency.sql:213-219`). المجاني يزيد
   `used_count` فورًا (`20260709000000_washa_ai_credit_wallet.sql:119-125`)،
   والمدفوع ينقص `balance` ويزيد `lifetime_consumed` ويسجل ledger فورًا
   (`:143-156`). إذن كلمة “reserve” تعني **استهلاكًا فعليًا قابلًا للعكس**.
6. **متى تبقى الخصمة ومتى تُعاد؟** عند نجاح المسار الأساسي لا يوجد استدعاء
   release؛ يكمل route الطلب عند الأسطر 912-916 وتبقى الوحدة مستهلكة. عند
   الاستثناء بعد حجز tracked، يدخل catch عند السطر 648 ويستدعي
   `releaseDailyQuota()` عند 759. الاسترداد المرتبط بالطلب يستخدم
   `refund_washa_ai_generation_once`؛ يعيد المجاني بخفض `used_count` أو يعيد
   المدفوع إلى المحفظة ويسجل `refund`، ويحمي من التكرار بواسطة
   `quota_refunded_at` (`20260716000000_dtf_generation_idempotency.sql:336-449`).
   إذا فشل تأكيد الاسترداد، يحجب route إعادة المحاولة ويرجع 500
   (`route.ts:819-831`). إذا لم تكن الحصة tracked فلا release، ويعلّم claim
   كـfailed مباشرة (`:833-838`).

### ملاحظة أمان مكتشفة أثناء الاستكشاف

`reserveDailyQuota()` لا يستهلك الرصيد فقط؛ فهو يطبّق أيضًا تحكم
`controls.audience` قبل الاستهلاك (`dtf-telemetry.service.ts:214-226`). لذلك
استبداله مباشرة بنتيجة bypass عند `shouldChargeQuota=false` سيتجاوز منع فئة
مُعطّلة. B2 لن يفعل ذلك. في حالة عدم الاحتساب سيستخدم الواجهة read-only
الموجودة `DtfTelemetryService.getQuotaStatus()`، التي لا تزيد أي عدّاد
(`:540-544`) وتعيد `blocked` للفئة المعطّلة (`:555-560`). بعدها فقط يبني route
نتيجة quota غير tracked. بهذا نحصل معًا على:

- صفر استدعاء إلى `reserveDailyQuota()` وصفر mutation للحصة؛
- استمرار منع `audience_disabled` كما في المسار الحالي؛
- تجاهل نفاد الرصيد عندما قررت السياسة عدم الاحتساب؛
- استمرار دلالة `quota_enabled=false` وadmin/dev كـunlimited من دون حجز.

أي throw غير متوقع من فحص الأهلية read-only يرجع 503 قبل provider، claim
يُعلّم failed، ولا يُحجز أو يُعاد شيء. حالات فشل الإعدادات/القراءة المعتادة
مغطاة أصلًا بالـfail-safe داخل `getQuotaStatus()`.

## 2. قرار الحصة قبل الـmutation

### ترتيب القرار

بعد validation وaccess وrate limit والتأكد من `access.profileId`، وقبل
readiness وclaim والحجز، ينفذ route:

1. يهيئ `mode = "primary"`.
2. يستدعي `getGenerationMode()` داخل guard. أي throw غير متوقع يُسجّل من دون
   تفاصيل حساسة ويبقي `primary`. الدالة نفسها تعيد primary عند فقد/فساد/فشل
   setting، وهذا guard يحمي من regression برمجي خارج عقدها.
3. إذا كان mode أساسيًا، ينفذ existing-generation وpersisted-attempt وفحصي
   readiness الحاليين. إذا كان board فلا يستدعي أيًا منها.
4. في board، يتأكد من وجود `generationContext` قبل claim والحصة؛ غيابه يرجع
   `INVALID_BOARD_INPUT`/400 مع عدّادي حجز واسترداد يساويان صفرًا.
5. يستدعي `shouldChargeQuota(mode)` قبل claim والحجز. إذا خرج throw غير متوقع،
   فالـfail-safe هو `mode === "primary"`: الأساسي يُحتسب، والاحتياطي لا
   يُحتسب، مطابقًا لإعداد `auto` الآمن في B0.
6. ينفذ claim الحالي مرة واحدة.
7. إذا كانت المحاولة الأساسية persisted كما في السلوك الحالي، أو كان قرار
   الاحتساب false، فلا يستدعي reserve. persisted يستخدم bypass الحالي؛ أما
   no-charge فيجري فحص الأهلية read-only الموصوف أعلاه ثم يبني نتيجة
   `{ allowed: true, tracked: false, source: "bypass" }`.
8. إذا كان قرار الاحتساب true، يستدعي `reserveDailyQuota()` مرة واحدة فقط
   بالـ`profileId/traceId/operation` الحاليين.

إذًا، رغم أن الحجز الحالي يقع قبل السطر 607، B2 لا يعتمد نمط “احجز ثم أعد
فورًا” للحالة no-charge. القرار يُقرأ قبل الحجز، وشرط الحجز يمنع الاستدعاء
من الأصل. الاختبار المطلوب يثبت `reserve=0` و`release=0`، لا مجرد رصيد نهائي
صحيح بعد حركتين خطرتين.

### مصفوفة القرار المطلوبة

`quotaCharged` يعني أن الحجز **حدث فعليًا**، ولذلك يساوي `quota.tracked`، لا
مجرد نية `shouldChargeQuota`. مثال: admin أو نظام quota معطّل قد يمر عبر قرار
charge=true لكن `reserveDailyQuota()` يعيد untracked؛ الإفصاح الصادق حينها هو
`quotaCharged=false`.

| mode | `quota_charging` | قرار الاحتساب | reserve عند نجاح عادي | release عند نجاح عادي | `quotaCharged` |
|---|---|---:|---:|---:|---:|
| primary | `{ auto: true }` | true | 1 | 0 | لا يضاف إلى response الأساسي |
| fallback | `{ auto: true }` | false | 0 | 0 | false |
| fallback | `{ auto: false, manual_override: "enabled" }` | true | 1 | 0 | true إذا كانت النتيجة tracked |
| primary | `{ auto: false, manual_override: "disabled" }` | false | 0 | 0 | لا يضاف إلى response الأساسي |

المصفوفة أعلاه تفترض subscriber عاديًا، quota مفعّلة، ونتيجة توليد ناجحة.
للفشل بعد الحجز:

| الحالة | reserve | release | claim النهائي |
|---|---:|---:|---|
| fallback no-charge يفشل | 0 | 0 | `failed`, غير محجوب |
| fallback charged يفشل والاسترداد ينجح | 1 | 1 | يعلّمه RPC الاسترداد `failed` |
| fallback charged يفشل والاسترداد لا يتأكد | 1 | 1 محاولة | `blocked` + HTTP 500 |

لا يُستدعى release إلا إذا كان `quota.tracked === true`. لا يسترد B1 شيئًا،
ولا يسترد route مرتين؛ `refund_washa_ai_generation_once` يبقى شبكة أمان
idempotent لا بديلًا عن عدّاد الاستدعاءات الصحيح.

### تعارض شكلي في عبارة “كتلة fallback هي الإضافة الوحيدة”

متطلب المراجعة الجديد `primary + manual=disabled → لا يُخصم` يعني أن route
الأساسي نفسه يجب أن يستشير `shouldChargeQuota("primary")` قبل reserve. لذلك
لا يمكن حرفيًا تحقيق هذا المتطلب وفي الوقت نفسه جعل حذف كتلة fallback وحدها
يعيد **كل** route إلى B1. الحسم في B2 هو:

- توجد كتلة تنفيذ board واحدة فقط: `if (mode === "fallback")` عند seam السطر
  607؛ لا توجد fallback متخفية داخل provider أو catch الأساسي.
- التغييرات الأخرى wiring مشتركة وصغيرة ومرئية: قراءة mode/charge قبل
  الحجز، gating لفحصي readiness، وشرط no-charge حول reserve.
- جسم استدعاء `DesignAssetService.generate()` وcatch/success الأساسي لا
  يتغيران وظيفيًا.
- باب الخروج الدقيق من B2 هو حذف كتلة board **وإرجاع wiring الحصة/readiness
  والواجهة**؛ حذف الكتلة وحدها لا يكفي بسبب manual override للأساسي.

هذا الحسم يتبع مصفوفة الحصة الصريحة ولا يخفي تغييرًا مطلوبًا خلف صياغة باب
الخروج القديمة.

## 3. التفرّع في route

### موقع التفرّع والتدفق

`getGenerationMode()` يقع قبل الحصة وقبل نقطتي readiness الحاليتين. كتلة
التنفيذ الوحيدة للـboard توضع عند seam الحالي قبل
`DesignAssetService.generate()` (السطر 607 في B1):

```typescript
if (mode === "fallback") {
    const boardResult = await generateBoard({
        profileId: access.profileId,
        generationRequestId: traceId,
        prompt,
        generationContext,
    });

    // failure: release once iff quota.tracked, then settle the claim
    // success: complete the claim and return the board-only response
}

// mode === "primary": existing DesignAssetService.generate() path
```

هذه الكتلة لا تستدعي أو تمسك أي دالة من المسار الأساسي. تستدعي واجهة B1
الوحيدة `generateBoard()`، ولا تعرف prompt renderer أو provider adapter أو
storage أو جدول board.

### readiness وreplay الأساسي

على B1 الحالي:

- `getWashaDtfGenerationReadiness()` عند السطر 338؛
- `DesignAssetService.getExistingGeneration()` عند 349؛
- `DesignAssetService.hasPersistedGenerationAttempt()` عند 366؛
- `getIsolatedArtworkProviderReadiness()` عند 389.

كل الأربعة primary-only. في fallback لا تُستدعى، وبذلك لا يستطيع غياب
isolated artwork أو Master pipeline منع board. هذا gating لا يغيّر شروطها أو
رسائلها أو ترتيبها عندما يكون mode=primary. كما يمنع تسريب اعتماد على
`DesignAssetService` إلى board، لا readiness فقط.

فشل قراءة mode يختار primary، لذلك **لا** يتخطى readiness. هذا هو fail-safe:
تعطل setting لا يفتح مسارًا أقل ضمانًا.

### claim وفشل B1

يبقى `claimDtfGenerationRequest()` هو غلاف idempotency المشترك. بعد نجاح claim
وقرار الحصة:

- نجاح B1: يسجل telemetry board منفصلة، يستدعي
  `completeDtfGenerationRequest()` مرة، ثم يرد 200؛
- `INVALID_BOARD_INPUT`: 400، غير retryable؛ يفترض أن يمنعه precheck في
  route، ويبقى guard دفاعيًا؛
- `BOARD_GENERATION_IN_PROGRESS`: 409، غير retryable؛
- `IMAGE_PROVIDER_UNAVAILABLE`: 503، retryable؛ صف B1 يكون `failed`؛
- `BOARD_STORAGE_UNAVAILABLE` أو `BOARD_PERSISTENCE_FAILED`: 503 برسالة عامة
  لا تكشف المزود، وretryable=false للمحاولة نفسها.

في كل فشل بعد reserve tracked يستدعي route `releaseDailyQuota()` بالـsource
وquotaDate وtraceId نفسها مرة واحدة. نجاح release لا يتبعه
`failDtfGenerationRequest()` ثانية لأن RPC الاسترداد يعلّم سجل الطلب failed.
إذا لم تكن tracked يستدعي fail مباشرة. فشل تأكيد release يطابق سياسة الأساسي:
claim محجوب، HTTP 500، ورسالة تطلب مراجعة الرصيد قبل إعادة المحاولة.

### استجابة fallback

الحد الأدنى الملزم للاستجابة الناجحة:

```json
{
  "ok": true,
  "requestId": "<traceId>",
  "mode": "fallback",
  "boardImageUrl": "https://.../board-<id>.webp",
  "boardRequestId": "<uuid>",
  "disclaimer": "preview_only",
  "quotaCharged": false
}
```

يضاف envelope الرصيد الحالي (`remainingPoints`, `freeRemaining`,
`paidBalance`, `consumedSource`, `guest`) بالقيم الفعلية عند tracked و`null`
عند untracked، حتى يتحدث widget عند manual charge. لا تعيد الاستجابة
`previewUrl` أو `designRequestId` أو `masterAssetId` أو `masterAssetUrl` أو
`masterChecksum` أو placement مصطنعًا. الصورة WebP للعرض كما ضمن B1، وليست
PNG ولا أصل طباعة.

لا يضاف `mode` أو `disclaimer` أو `quotaCharged` إلى استجابة primary؛ شكلها
الحالي عند `route.ts:924-933` يبقى كما هو.

## 4. الإفصاح الإلزامي في UI

### عقد client adapter

`washa-dtf-studio/src/services/geminiService.ts` يصبح حدًا discriminated بدل
إجبار fallback على شكل أصل الطباعة:

- primary: التحقق الحالي نفسه من `imageUrl/previewUrl/designRequestId/
  masterAssetId/masterAssetUrl/masterChecksum/placement`؛
- board: عندما `mode === "fallback"` **أو** `disclaimer === "preview_only"`،
  يجب وجود `boardImageUrl` و`boardRequestId`. النتيجة الداخلية تحمل mode
  fallback وdisclaimer preview-only وquotaCharged، ولا تُنشئ معرّفات Master
  وهمية؛
- `dispatchQuotaChanged()` يظل بعد response الناجح ويستخدم envelope الحقيقي.

اعتبار أي واحدة من إشارتي fallback كافيًا للإفصاح دفاع مقصود: خطأ تكامل
يحذف `disclaimer` لا يجوز أن يخفي الشارة إذا كان mode fallback، والعكس صحيح.

### أين يقرأ `DesignContext.tsx` mode/disclaimer؟

بعد رجوع `runGenerate()` مباشرة في كتلة النجاح الحالية، أي عند seam
`DesignContext.tsx:801-813` في B1. هناك يشتق السياق:

- `isBoardPreview` من `generated.mode/generated.disclaimer`؛
- URL التحقق والعرض: `boardImageUrl` للـboard، و`previewUrl` للأساسي؛
- `generationResult` كاتحاد صريح، و`mockupImage` بالـURL الصحيح؛
- `extractedImage = null` للـboard، و`masterAssetUrl` للأساسي فقط.

كما يضيف `isBoardPreview` و`generationDisclaimer` إلى واجهة `DesignContext`
ليقرأهما مكوّن النتيجة. `canRecompose` عند الأسطر 689-694، و`handleExtract`
عند 1025، و`submitOrder` عند 1053 تحصل على guards primary-only دفاعية؛ لا
يصل board إلى recompose أو extract أو submit حتى لو ظهر زر بسبب regression.

### فحص الرصيد المسبق في العميل

يوجد حاليًا قرار مانع في `DesignContext.tsx:689-709` عبر
`requestGenerationAccess()`. هذا العميل لا يعرف mode التشغيلي، ولذلك يمكن أن
يمنع صاحب رصيد صفر قبل أن يصل إلى fallback+auto الذي لا يحتسب حصة. في B2
يصبح route المرجع الوحيد لقرار السماح المرتبط بالحصة: لا يمنع DesignContext
generation بسبب الرصيد المخبأ مسبقًا. `audience_disabled` و`quota_exceeded`
يأتيان من route وينشّطان أحداث Credits الحالية. النتيجة البصرية للأساسي عند
النفاد تبقى نافذة الرصيد نفسها، لكن من دون قرار عميل قديم يناقض mode الخادم.

فحص auth يبقى قبل الطلب، وrate limit وaudience والحصة تبقى server-enforced.
لا يثق B2 بالعميل لإعفاء حصة أو لاختيار mode.

### الشارة والنص الدقيق

الشارة عنصر React ثابت فوق بطاقة النتيجة، وليست جزءًا من prompt أو الصورة،
وتظهر لكل board حتى لو تجاهل نموذج الصورة أي نص. النص الحرفي:

> ⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب.

تستخدم `role="status"` ونص DOM فعليًا. لا يقبل المكوّن نصًا قادمًا من
provider؛ قيمة API `preview_only` تختار النسخة الثابتة فقط.

### إخفاء ما يوحي بملف طباعة نهائي

في `components/steps/StepResult.tsx`، عندما يكون `isBoardPreview=true`:

- يتغير عنوان “النتيجة النهائية” إلى “معاينة مبدئية”؛
- تظهر الشارة السابقة قبل الصورة؛
- تختفي عبارة “يُستخدم نفس ملف التصميم المعتمد في المعاينة والطباعة”؛
- تختفي كتلة “اعتماد التصميم” وزر “اعتماد وإضافة إلى السلة”، لأن submit-order
  الحالي يتطلب Master/Checksum لا يملكه board؛
- لا تظهر جهات front/back أو أي control مبني على حقول primary؛
- يبقى عرض الحجم الكامل وتنزيل **المعاينة** فقط، واسم تنزيل board هو
  `washa-board-preview.webp` حتى يطابق bytes الفعلية. لا يسمى PNG ولا “ملف
  الطباعة”.

المسار الداخلي `dev-v2` يقرأ السياق نفسه؛ يخفي كذلك “استخراج التصميم” و“تحميل
ملف الطباعة” عند board. الـguards داخل DesignContext تمنع التنفيذ حتى لو نُسي
gating بصري لاحقًا.

عندما يكون primary، كل الشروط الجديدة false: عنوان النتيجة، الضمان، CTA،
front/back، أسماء التنزيل، extract، submit والتنسيق الحالي تبقى بلا تغيير
بصري.

## 5. عدم المساس بالمسار الأساسي

حدود العزل الملزمة:

- لا تعديل في `design-asset.service.ts` ولا أي ملف تحت
  `src/lib/washa-artwork/` ولا خدمات Master/Derivative/Checksum/compositor؛
- لا استدعاء من كتلة board إلى `DesignAssetService` أو readiness الأساسي؛
- لا استدعاء من المسار primary إلى `generateBoard`؛
- لا fallback مخفي داخل catch الأساسي؛
- لا حقول board في response الأساسي ولا حقول Master مصطنعة في response board؛
- B1 يبقى المالك الوحيد لتوليد/provider/storage/persistence الخاص باللوحة؛
  route يملك mode/quota/HTTP فقط، والواجهة تملك العرض والإفصاح فقط.

اختبار regression لـ`mode=primary` يثبت response الحالي حرفيًا، واستدعاء
readiness و`DesignAssetService.generate()` الحاليين، وعدم استدعاء
`generateBoard()`. الاختبارات الحالية في `generate-mockup.route.test.ts`
تبقى كلها مارة؛ لا تُستبدل باختبار B2 أضعف.

## 6. خطة الاختبار

### اختبارات route والحصة

يمتد `tests/dtf/generate-mockup.route.test.ts` بم mocks صريحة لـ:
`getGenerationMode`, `shouldChargeQuota`, `getQuotaStatus`, `generateBoard`,
`reserveDailyQuota`, و`releaseDailyQuota`.

جدول parameterized واحد يغطي التركيبات الأربع بعدّادات فعلية:

| الحالة | primary generate | board generate | reserve | release |
|---|---:|---:|---:|---:|
| primary + auto | 1 | 0 | 1 | 0 |
| fallback + auto | 0 | 1 | 0 | 0 |
| fallback + manual enabled | 0 | 1 | 1 | 0 |
| primary + manual disabled | 1 | 0 | 0 | 0 |

ويثبت أيضًا أن no-charge يستدعي `getQuotaStatus()` مرة، وأن `blocked=true`
يرجع audience_disabled قبل أي provider مع reserve/release صفر.

اختبارات failure المنفصلة:

1. B1 provider failure + fallback auto: reserve 0، release 0، claim failed.
2. B1 provider failure + manual enabled: reserve 1، release 1 بالـsource/date/
   request الصحيحة، ولا استرداد ثانٍ.
3. فشل release: reserve 1، release 1 محاولة، claim blocked، HTTP 500.
4. generationContext مفقود في fallback: 400 قبل claim/reserve/provider.
5. فشل `getGenerationMode()`: primary readiness وprimary provider يعملان،
   board لا يعمل، وسياسة الحصة الافتراضية تُحتسب.
6. primary readiness غير جاهز: نفس status/code الحاليان، reserve وboard صفر.
7. fallback مع readiness mocks غير جاهزة: لا تُستدعى تلك mocks أصلًا وينجح
   board.
8. نجاح fallback يثبت shape و`quotaCharged=quota.tracked` وإكمال claim مرة.
9. regression primary يقارن payload الحالي ولا يجد أي مفاتيح B2.

اختبارات B0 الحالية لمصفوفة normalization/decision تبقى مارة، لكنها لا تحل
محل عدّادات route؛ الأولى تثبت القرار، والثانية تثبت الـside effect.

### اختبارات client والإفصاح

- اختبار client adapter: يقبل response board WebP، لا يطلب Master، ويحتفظ
  بـmode/disclaimer/quotaCharged؛ primary validation القديم يبقى كما هو.
- اختبار presentation policy: board يعطل recompose/extract/submit/print-file
  actions؛ primary يعيد flags الحالية كلها.
- اختبار render في بيئة node بواسطة `react-dom/server`: الشارة تظهر بالنص
  العربي الحرفي عند mode fallback أو disclaimer preview_only، ولا تُرسم في
  primary. هذا يختبر عنصر UI نفسه، لا مجرد وجود string في المصدر.
- اختبار StepResult contract: board لا يرسم “اعتماد وإضافة إلى السلة” أو
  عبارة ضمان ملف الطباعة، ويستخدم اسم `.webp`؛ primary يحتفظ بالنصوص الحالية.
- اختبار تدفق الرصيد: حالة exhausted محليًا لا تمنع إرسال الطلب؛ رد route
  quota_exceeded يفتح نافذة Credits، بينما fallback no-charge يعرض اللوحة
  والشارة.

### التحقق بعد التنفيذ

بعد موافقة التنفيذ فقط:

```text
npm run test:unit
npm run lint
npm run build
```

كما يُراجع diff من رأس B1 للتأكد من صفر تغييرات على الملفات الأساسية المحظورة
أعلاه، ومن أن `generation_mode` بقي غير مفعّل ولم يحدث merge.

## 7. ملفات التنفيذ المتوقعة بعد الموافقة

- تعديل `src/app/api/washa-dtf-studio/generate-mockup/route.ts` للقرار، gating،
  الحصة وكتلة board الواحدة.
- تعديل اختبارات route الحالية.
- تعديل `washa-dtf-studio/src/services/geminiService.ts` لاتحاد الاستجابة.
- تعديل `washa-dtf-studio/src/context/DesignContext.tsx` لقراءة mode/disclaimer
  وإزالة منع الحصة العميلي غير المدرك للوضع وإضافة guards.
- تعديل `washa-dtf-studio/src/components/steps/StepResult.tsx` للإفصاح/actions.
- gating دفاعي لأزرار الطباعة في
  `washa-dtf-studio/src/components/dev-v2/WashaDevStudioV2.tsx`.
- إضافة module/presentation صغير ومكوّن شارة قابلين للاختبار، واختبارات
  client/UI المرتبطة بهما.

لا migration ولا تغيير B1 provider service ولا B3 ضمن هذه القائمة.

## 8. بوابة الإكمال وباب الخروج

B2 لا يُعد مكتملًا حتى تمر التركيبات الأربع بعدّادات reserve/release، وفشل
الاسترداد، وprimary regression، وfail-safe mode، واختبار ظهور الشارة الفعلي،
ثم test:unit/lint/build.

للرجوع عن B2 قبل الدمج: تزال وصلة route وwiring mode/quota/readiness، وتعاد
أنواع/قراءة العميل وواجهة النتيجة إلى B1، وتحذف اختبارات B2 فقط. يبقى B0+B1
قابلين للمراجعة، ولا توجد بيانات board جديدة ما دام fallback لم يُفعّل.
