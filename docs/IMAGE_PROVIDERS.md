# مزوّدو توليد الصور (أداة التصميم)

التطبيق يدعم أكثر من مزوّد لتوليد الصور. الاختيار عبر متغيرات البيئة.

---

## التوصية السريعة

| المزوّد | مناسب لـ | السعر التقريبي | ملاحظات |
|--------|----------|----------------|---------|
| **Replicate** | مشاريع صغيرة/متوسطة، صورة مرجعية | دفع حسب الاستخدام (~$0.003–0.03/صورة) | مدعوم حالياً (نص + صورة→صورة)، سهل الإعداد |
| **Gemini (Imagen 3)** | بيئة Google، جودة عالية، عربي | ~$0.03/صورة | مدعوم حالياً (نص→صورة فقط)، مفتاح واحد من Google AI |
| **OpenAI DALL-E 3** | جودة عالية، واجهة بسيطة | أعلى من الخيارين أعلاه | يمكن إضافته لاحقاً بنفس النمط |

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

- يدعم نفس **نمط** الاختيار عبر `WASHA_DTF_IMAGE_PROVIDER`، وإن تُرك فارغاً يُستخدَم `IMAGE_PROVIDER`، وإن بقي فارغاً يُلجأ إلى **`genai`** (نموذج `gemini-2.5-flash-image` عبر `@google/genai`).
- القيم: **`genai`** (افتراضي واضح) | **`replicate`** (Flux) | **`nanobanana`** | **`gemini`**.
- **الكود:** `src/lib/washa-dtf-image-router.ts` + `src/lib/replicate-predictions.ts` + `src/lib/gemini-rest-image.ts`

---

## ملخص تقني

- **الكود:** `src/app/actions/ai.ts`
- **الدوال:** `generateImage` (استخدامات أخرى)، `generateDesignForPrint` (أداة تصميم قطعة)
- **Replicate:** نموذجان — `black-forest-labs/flux-schnell` (نص→صورة)، `bxclib2/flux_img2img` (صورة→صورة)
- **Gemini:** نموذج `imagen-3.0-generate-002` عبر `generativelanguage.googleapis.com/v1beta/models/...:predict`، الاستجابة base64 → تُحوَّل إلى data URL للعرض
