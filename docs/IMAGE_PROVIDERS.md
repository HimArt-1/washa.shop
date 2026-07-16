# مزوّدو توليد الصور (أداة التصميم)

التطبيق يدعم أكثر من مزوّد لتوليد الصور. الاختيار عبر متغيرات البيئة.

---

## التوصية السريعة

| المزوّد | مناسب لـ | السعر التقريبي | ملاحظات |
|--------|----------|----------------|---------|
| **Replicate** | مشاريع صغيرة/متوسطة، صورة مرجعية | دفع حسب الاستخدام (~$0.003–0.03/صورة) | مدعوم حالياً (نص + صورة→صورة)، سهل الإعداد |
| **Gemini (Imagen 3)** | بيئة Google، جودة عالية، عربي | ~$0.03/صورة | مدعوم حالياً (نص→صورة فقط)، مفتاح واحد من Google AI |
| **OpenAI GPT Image** | أصل طباعة PNG شفاف في WASHA AI | حسب النموذج والجودة | المسار الإلزامي حاليًا لـ`design-master.png` لأنه يضبط Alpha عبر API |

- إن كان لديك **Replicate** بالفعل: اترك الإعداد الحالي، يعمل من الصندوق.
- إن فضّلت **Google (Gemini)**: أضف `GEMINI_API_KEY` و`IMAGE_PROVIDER=gemini` (انظر أدناه).
- مسار **«من صورة»** (صورة مرجعية) يعمل حالياً عبر **Replicate** فقط؛ Gemini يُستخدم لنص→صورة.

---

## الإعداد

### Replicate (الافتراضي)

في `.env.local`:

```env
REPLICATE_API_TOKEN=r8_xxxx
# اختياري: IMAGE_PROVIDER=replicate
```

- المفتاح من: [replicate.com/account](https://replicate.com/account)
- يدعم: **نص→صورة** (FLUX Schnell) و **صورة→صورة** (FLUX img2img)

### Gemini (Imagen 3)

في `.env.local`:

```env
GEMINI_API_KEY=xxxx
# أو GOOGLE_GENERATIVE_AI_API_KEY=xxxx
IMAGE_PROVIDER=gemini
```

- المفتاح من: [Google AI Studio](https://aistudio.google.com/apikey) أو Google Cloud Console
- يدعم: **نص→صورة** فقط (لا صورة مرجعية في نفس الطلب)
- عند استخدام «من صورة» مع `IMAGE_PROVIDER=gemini`، التطبيق يرسل الصورة لـ Replicate إن وُجد `REPLICATE_API_TOKEN`، وإلا يُستخدم النص فقط مع Imagen

### أولوية المزوّد

- إذا `IMAGE_PROVIDER=gemini` و`GEMINI_API_KEY` موجود → يُستخدم Gemini للنص→صورة.
- وإلا إذا `REPLICATE_API_TOKEN` موجود → يُستخدم Replicate.
- إذا لا مفتاح لأي منهما → محاكاة (صورة Unsplash) للتطوير فقط.

---

## WASHA AI (مسار DTF / `/design/washa-ai`)

- أصل التصميم الشفاف يستخدم GPT Image مع `PNG` و`background=transparent`، ثم يُتحقق من Alpha ويُحفظ دائمًا قبل العرض.
- الإعدادات: `OPENAI_IMAGE_MODEL=gpt-image-1` و`WASHA_ARTWORK_OPENAI_SIZE=1024x1536`، مع حد effective DPI قابل للضبط عبر `WASHA_DTF_MIN_EFFECTIVE_DPI`.
- `WASHA_DTF_IMAGE_PROVIDER` يحدد مزود القطعة الفارغة فقط عند غياب صورة مرجعية مطابقة.
- Gemini/Replicate لا يُسمح لهما بإعادة رسم تصميم العميل على القماش.
- **الكود:** `src/lib/washa-artwork/*` و`src/app/api/washa-dtf-studio/services/design-asset.service.ts`.
- **التفاصيل والمmigration:** `docs/WASHA_AI_SINGLE_SOURCE_ASSETS.md`.

---

## ملخص تقني

- **الكود:** `src/app/actions/ai.ts`
- **الدوال:** `generateImage` (استخدامات أخرى)، `generateDesignForPrint` (أداة تصميم قطعة)
- **Replicate:** نموذجان — `black-forest-labs/flux-schnell` (نص→صورة)، `bxclib2/flux_img2img` (صورة→صورة)
- **Gemini:** نموذج `imagen-3.0-generate-002` عبر `generativelanguage.googleapis.com/v1beta/models/...:predict`، الاستجابة base64 → تُحوَّل إلى data URL للعرض
