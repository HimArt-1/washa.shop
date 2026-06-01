
# وشّى — دليل الهوية البصرية المتكاملة
### WASHA Visual Identity System · النسخة 7.07

---

> **فنٌّ يُرتدى** · Art You Wear
> منصة أزياء سعودية تجمع الفن والتقنية والتراث في قطعة واحدة.

---

## 01 · الفلسفة والروح

وشّى ليست متجراً للملابس. هي **منصة تعبير** تحوّل الفن إلى ملبس والملبس إلى هوية شخصية. تقف عند تقاطع ثلاث محاور:

| المحور | التعبير |
|--------|---------|
| **التراث** | عمق اللون، الطابع الدافئ، اللمسة العربية |
| **الحداثة** | الذكاء الاصطناعي، الزجاجية، التفاعلية |
| **الفن** | الفنانون المحليون، الطباعة الرقمية (DTF/DTG) |

الهوية البصرية مبنية على **التناقض الجميل**: عمق التراث + بريق التقنية. خلفية دافئة كالعاج وذهب حيّ ونصوص بخطٍ عصري عربي.

---

## 02 · الشعار (Logo)

### الشعار الرئيسي
- **الاسم:** وشّى · WASHA
- **الملفات:**
  - `/public/header-logo-identity.png` — الشعار الرئيسي للهيدر والبطاقات
  - `/public/hero-logo.png` — نسخة Hero للصفحة الرئيسية
  - `/public/hero-logo-cinematic.png` — النسخة السينمائية
  - `/public/hero-logo-wordmark.png` — الوردمارك (الاسم فقط)
  - `/public/HEDR_LOGO.png` — النسخة البديلة للهيدر

### معالجة الشعار
```css
/* تقنية الـ Mask — تلوين الشعار بأي لون */
WebkitMaskImage: url('/header-logo-identity.png');
maskImage: url('/header-logo-identity.png');
maskSize: contain;
maskRepeat: no-repeat;
maskPosition: center;

/* Light Mode: الشعار بلون الحبر */
--hero-logo-tone: #4b3434;

/* Dark Mode: الشعار بالذهب */
--hero-logo-tone: #e0c99a;
```

### تأثيرات الشعار
```css
/* Light Mode */
filter: drop-shadow(0 0 30px rgba(75,52,52,0.38))
        drop-shadow(0 18px 64px rgba(75,52,52,0.2))
        drop-shadow(0 1px 0 rgba(255,246,236,0.44));

/* Dark Mode */
filter: drop-shadow(0 0 34px rgba(224,201,154,0.3))
        drop-shadow(0 0 110px rgba(99,63,61,0.22))
        drop-shadow(0 22px 70px rgba(0,0,0,0.48));
```

### حجم الشعار في المناطق المختلفة
| المنطقة | الحجم |
|---------|-------|
| Header | `h-[32px] w-[36px]` أو حسب السياق |
| Hero | مساحة كبيرة مع هالة ضوئية |
| بطاقة العمل - صغير | `h-[42px] w-[48px]` |
| بطاقة العمل - كبير | `h-[96px] w-[110px]` |
| بطاقة الشكر | `h-[46px] w-[52px]` |
| بطاقة التواصل | `h-[58px] w-[66px]` |
| Footer (خافت) | `h-[34px] w-[40px]` opacity-60 |

---

## 03 · لوحة الألوان

### الوضع الفاتح (Light Heritage — الافتراضي)

```css
/* الخلفيات */
--wusha-bg:       #f4ede3;   /* بيج دافئ — خلفية عامة */
--wusha-surface:  #fffdfa;   /* أبيض ناصع — الكروت */
--wusha-surface-2:#eee4d5;   /* بيج أعمق — طبقة ثانوية */

/* النصوص */
--wusha-text:      #1a1612;  /* حبر داكن */
--wusha-text-muted: rgba(26,22,18, 0.55);
--wusha-ink:       #1a1612;

/* الحدود */
--wusha-border:       rgba(90,62,43, 0.14);
--wusha-border-strong: rgba(90,62,43, 0.24);
```

### الألوان الأساسية (Brand Colors)

```css
/* الذهب — التوقيع المحوري */
--wusha-gold:       #9a7b3d;   /* Light Mode */
--wusha-gold:       #ceae7f;   /* Dark Mode */
--wusha-gold-light: #b8964f;   /* Light Mode */
--wusha-gold-light: #e0c99a;   /* Dark Mode */

/* الأرض — العمق والثبات */
--wusha-earth: #5A3E2B;

/* الضباب — الفخامة الهادئة */
--wusha-mist: #6b5b7a;   /* Light Mode */
--wusha-mist: #9D8BB1;   /* Dark Mode */

/* الغابة — الأمل والنمو */
--wusha-forest: #1e5c42;   /* Light Mode */
--wusha-forest: #2a7a5a;   /* Dark Mode */

/* لون هوية البطاقات */
--wusha-ink:       #4b3434;  /* أحمر داكن دافئ — الحبر */
```

### الوضع الداكن (Dark Heritage)

```css
/* الخلفيات */
--wusha-bg:      #080808;   /* أسود تقريباً */
--wusha-surface: #111111;   /* رمادي داكن جداً */
--wusha-surface-2:#1a1a1a;  /* طبقة ثانوية */

/* النصوص */
--wusha-text:      #f0ebe3;   /* كريمي دافئ */
--wusha-text-muted: rgba(240,235,227, 0.5);
--wusha-ink:       #f0ebe3;

/* الحدود */
--wusha-border:        rgba(206,174,127, 0.10);
--wusha-border-strong: rgba(206,174,127, 0.25);
```

### طيف الذهب الكامل

| الدرجة | HEX Light | HEX Dark | الاستخدام |
|--------|-----------|----------|-----------|
| عميق | `#8a6635` | `#6c4b4b` | التدرجات، النهاية |
| أساسي | `#9a7b3d` | `#ceae7f` | الأزرار، الحدود، الأيقونات |
| متوسط | `#caa45f` | `#d9b777` | التمييز، الشارات |
| فاتح | `#b8964f` | `#e0c99a` | التمرير، التدرجات |
| ناصع | `#e0c99a` | `#f6ddba` | النص على الداكن |

### التدرجات الموقّعة

```css
/* تدرج الذهب الموقَّع — CTA Buttons */
linear-gradient(105deg,
  var(--wusha-earth) 0%,
  var(--wusha-gold) 40%,
  var(--wusha-gold-light) 60%,
  var(--wusha-gold) 80%,
  var(--wusha-earth) 100%
)

/* نص ذهبي متحرك */
linear-gradient(135deg,
  var(--wusha-earth) 0%,
  var(--wusha-gold) 30%,
  var(--wusha-gold-light) 50%,
  var(--wusha-gold) 70%,
  var(--wusha-earth) 100%
)

/* خلفية Hero — Light */
linear-gradient(180deg, #f3e8db 0%, #efe1d2 48%, #f6efe6 100%)

/* خلفية Hero — Dark */
linear-gradient(180deg, #050303 0%, #0b0607 48%, #050303 100%)
```

### Neon Accents (التوهجات)

```css
--neon-gold:  rgba(154,123,61, 0.35);   /* Light */
--neon-gold:  rgba(206,174,127, 0.60);  /* Dark */
--neon-cyan:  rgba(34,211,238, 0.25);
--neon-mist:  rgba(107,91,122, 0.30);
```

---

## 04 · الخطوط (Typography)

### عائلات الخطوط

| الخط | الاستخدام | المصدر |
|------|-----------|--------|
| **TheYearOfTheCamel** | العنوان الأول، العروض، الجسم | `/public/fonts/TheYearofTheCamel-*.otf` |
| **ArabicPoetry** | الخط الثانوي، الشعر | `/public/fonts/ArabicPoetry-Medium.otf` |
| **Alnaseeb** | خط تاريخي، العناوين الثانوية | `/public/fonts/Alnaseeb-Regular.otf` |

### ميزان الوزن (Weights)

| الوزن | الرقم | الاستخدام |
|-------|-------|-----------|
| Thin | 100 | الزخارف الخفيفة |
| ExtraLight | 200 | النصوص المساعدة |
| Light | 300 | النصوص الطويلة |
| Regular | 400 | نص الجسم `--wusha-body-weight` |
| Medium | 500–600 | العناوين الثانوية |
| Bold | 700 | `--wusha-heading-section-weight` |
| ExtraBold | 800–900 | `--wusha-heading-main-weight` |

### مقياس الأحجام

```css
--fs-display:  clamp(3rem, 7vw, 5.5rem);   /* شاشة Hero — أكبر عنوان */
--fs-h1:       clamp(2.25rem, 5vw, 3.5rem);
--fs-h2:       clamp(1.75rem, 3.5vw, 2.5rem);
--fs-h3:       1.5rem;
--fs-h4:       1.25rem;
--fs-body:     1rem;
--fs-small:    0.875rem;
--fs-xs:       0.75rem;
--fs-eyebrow:  0.6875rem;  /* 11px — علامة المقطع بالحروف اللاتينية */

/* للموبايل */
h1: clamp(2.5rem, 12vw, 4rem)
h2: clamp(1.75rem, 7vw, 2.5rem)
```

### التباعد والتتبع (Tracking)

```css
--tracking-eyebrow: 0.3em;    /* للـ eyebrow labels */
--tracking-display: 0.04em;   /* للعناوين الكبيرة */
--tracking-body:    0.02em;   /* للنصوص العادية */
```

### الارتفاع (Line Heights)

```css
display / h1:   1.05 – 1.2
headings:       1.2
body:           1.65 – 1.75
readable prose: max-width: 65ch, line-height: 1.75
```

### القواعد الطباعية

```
h1           → font-weight: 800, font-family: TheYearOfTheCamel
h2           → font-weight: 700
h3, h4       → font-weight: 600
h5, h6       → font-weight: 500
body text    → font-weight: 400
eyebrow      → uppercase, letter-spacing: 0.3em, font-size: 11px
all headings → text-wrap: balance
```

---

## 05 · نظام الزجاج (Glass System)

### Glass Card — البطاقة الأساسية

```css
.glass-card {
  background: var(--glass-bg);               /* rgba(255,253,248, 0.82) */
  backdrop-filter: blur(22px) saturate(1.4);
  border: 1px solid var(--wusha-border);
  box-shadow:
    0 4px 20px rgba(90,62,43, 0.14),
    inset 0 1px 0 rgba(26,22,18, 0.04);
  transition: all 0.5s ease;
}

.glass-card:hover {
  border-color: var(--wusha-border-strong);
  transform: translateY(-2px);
  box-shadow:
    0 14px 48px rgba(154,123,61, 0.09),
    0 6px 20px rgba(244,237,227, 0.30);
}
```

### Glass Premium — الزجاج الفاخر

```css
.glass-premium {
  background: linear-gradient(145deg,
    var(--glass-premium-from),   /* rgba(255,253,248, 0.92) */
    var(--glass-premium-to)      /* rgba(238,228,213, 0.76) */
  );
  backdrop-filter: blur(28px) saturate(1.6);
  border: 1px solid var(--glass-border);
  box-shadow:
    0 16px 56px rgba(244,237,227, 0.45),
    0 4px 20px rgba(154,123,61, 0.05),
    inset 0 1px 0 rgba(26,22,18, 0.05);
}
```

### Surface Panel — لوحة الأسطح

```css
.theme-surface-panel {
  background: linear-gradient(180deg,
    rgba(255,253,250, 0.98),   /* Light */
    rgba(238,228,213, 0.88)
  );
  border: 1px solid rgba(26,22,18, 0.09);
  box-shadow:
    0 26px 80px rgba(90,62,43, 0.10),
    0 10px 28px rgba(154,123,61, 0.06),
    inset 0 1px 0 rgba(255,253,250, 0.72);
  backdrop-filter: blur(22px);
}
```

---

## 06 · مكونات الواجهة (UI Components)

### الأزرار

#### btn-gold — الزر الذهبي الموقَّع
```css
/* الزر الأساسي لكل CTA رئيسي */
background: linear-gradient(105deg,
  #5A3E2B 0%,
  var(--wusha-gold) 40%,
  var(--wusha-gold-light) 60%,
  var(--wusha-gold) 80%,
  #5A3E2B 100%
);
background-size: 220% 100%;
color: var(--wusha-bg);
font-weight: 700;
padding: 16px 32px;
border-radius: var(--radius-md);   /* 12px */
box-shadow: 0 4px 24px rgba(154,123,61, 0.22);

/* Hover */
background-position: 100% 0;
transform: scale(1.02);
box-shadow: 0 6px 44px rgba(154,123,61, 0.38),
            0 0 80px rgba(154,123,61, 0.10);

/* Shimmer Effect */
::after { animation: shimmer 3s ease-in-out infinite; }
```

#### btn-secondary — الزر الثانوي
```css
border: 1px solid rgba(154,123,61, 0.30);
color: var(--wusha-gold);
background: transparent;
padding: 16px 32px;
border-radius: var(--radius-md);

/* Hover */
background: rgba(154,123,61, 0.10);
border-color: var(--wusha-gold);
```

#### btn-primary — الزر الأساسي (الغابة)
```css
background: var(--wusha-forest);  /* #1e5c42 */
color: white;
padding: 16px 32px;
border-radius: 8px;
```

#### btn-ghost — الزر الشفاف
```css
background: transparent;
border: 1px solid transparent;
color: var(--wusha-text-muted);
padding: 12px 18px;

/* Hover */
color: var(--wusha-gold);
background: rgba(154,123,61, 0.06);
```

### الكروت (Cards)

#### card-artwork — كرت الأعمال الفنية
```css
background: rgba(var(--wusha-surface), 0.70);
border: 1px solid rgba(154,123,61, 0.10);
border-radius: 16px;
box-shadow: 0 6px 24px rgba(var(--wusha-bg), 0.30);

/* Hover */
border-color: rgba(154,123,61, 0.38);
transform: translateY(-6px) scale(1.012);
box-shadow:
  0 28px 80px rgba(154,123,61, 0.12),
  0 10px 32px rgba(var(--wusha-bg), 0.40),
  inset 0 1px 0 rgba(154,123,61, 0.10);
```

#### brand-card — بطاقة الهوية المطبوعة
```css
/* Light Mode */
background: linear-gradient(135deg, #fff8f2 0%, #f0dfd2 100%);
border: 1px solid rgba(75,52,52, 0.16);
color: #4b3434;

/* Dark Mode */
background: linear-gradient(135deg, #2a1b18 0%, #130b0c 100%);
border: 1px solid rgba(224,201,154, 0.22);
color: #f6ddba;
```

### الحقول (Inputs)

```css
.input-theme {
  background: var(--glass-bg);
  border: 1px solid var(--wusha-border);
  border-radius: 12px;
  color: var(--wusha-text);
  padding: 12px 16px;

  /* Focus */
  border-color: var(--wusha-gold);
  background: var(--glass-bg-hover);
  box-shadow: 0 0 0 1px rgba(154,123,61, 0.30);
}
```

---

## 07 · نظام المساحات والنصف قطر

### المساحات (Spacing)

```css
--space-xs:  0.25rem;    /* 4px */
--space-sm:  0.5rem;     /* 8px */
--space-md:  1rem;       /* 16px */
--space-lg:  2rem;       /* 32px */
--space-xl:  4rem;       /* 64px */
--space-2xl: 8rem;       /* 128px */
```

### نصف القطر (Border Radius)

```css
--radius-xs:   6px;
--radius-sm:   10px;
--radius-md:   12px;     /* الأزرار، الحقول */
--radius-lg:   16px;     /* الكروت الصغيرة */
--radius-xl:   24px;     /* الكروت الكبيرة */
--radius-2xl:  32px;     /* glass-premium */
--radius-pill: 9999px;   /* الأيقونات الدائرية، الشارات */

/* الكروت المطبوعة */
border-radius: 1.6rem – 1.7rem;
```

---

## 08 · الحركة والتأثيرات (Motion)

### منحنيات التسهيل

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* الحركة الأساسية */
--ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-smooth:   cubic-bezier(0.4, 0, 0.2, 1);
```

### المدد الزمنية

```css
--duration-fast:   150ms;   /* التفاعلات الفورية */
--duration-normal: 300ms;   /* الانتقالات العادية */
--duration-slow:   600ms;   /* الانتقالات الكبيرة */
--duration-ultra:  1200ms;  /* الحركات المسرحية */
```

### الحركات الموقَّعة

```css
/* نبضة بطيئة — للعناصر الحية */
@keyframes pulse-slow {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 0.9; }
}

/* شيمر ذهبي — الأزرار والكروت */
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* نيون نبض — الشعار */
@keyframes neonPulse {
  0%, 100% { filter: drop-shadow(0 0 8px var(--neon-gold)); }
  50%       { filter: drop-shadow(0 0 20px var(--neon-gold)); }
}

/* عائم — الكروت والزخارف */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-20px); }
}

/* دخان Hero — خلفية الصفحة الرئيسية */
@keyframes hero-smoke-drift {
  0%   { opacity: 0.18; transform: translate3d(-6%,4%,0) rotate(-10deg) scale(0.96); }
  34%  { opacity: 0.42; transform: translate3d(7%,-5%,0) rotate(8deg) scale(1.08); }
  68%  { opacity: 0.30; transform: translate3d(-2%,7%,0) rotate(-3deg) scale(1.02); }
  100% { opacity: 0.18; transform: translate3d(-6%,4%,0) rotate(-10deg) scale(0.96); }
}

/* انزلاق للأعلى — دخول العناصر */
@keyframes slideUp {
  0%   { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* حركة نصية متحركة (Marquee) */
@keyframes wusha-marquee {
  from { transform: translateX(100%); }
  to   { transform: translateX(-100%); }
}
animation-duration: 20s;
```

### مبادئ الحركة

- كل hover رئيسي → `translateY(-2px to -8px)` بمدة 300–600ms
- Scale للأزرار: `hover: 1.02 / active: 0.98`
- Transition حقول: border-color → color → background
- **لا حركة** عند `prefers-reduced-motion: reduce`

---

## 09 · التأثيرات البصرية الخاصة

### Noise Texture
```css
/* طبقة ضجيج خفيفة فوق كل شيء */
opacity: 0.015;   /* Light Mode */
opacity: 0.025;   /* Dark Mode */
background-image: url("data:image/svg+xml,…fractalNoise…");
```

### Cyber Grid (الشبكة التراثية)
```css
.cyber-grid {
  background-image:
    linear-gradient(rgba(154,123,61, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(154,123,61, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### Neon Glow
```css
.neon-glow {
  box-shadow: 0 0 20px var(--neon-gold),
              0 0 40px rgba(154,123,61, 0.15);
}
.neon-glow-strong {
  box-shadow: 0 0 30px var(--neon-gold),
              0 0 60px rgba(154,123,61, 0.20);
}
```

### Orb Decorations (الكرات الضوئية)
```css
/* Gold Orb */
top: 4rem; right: -5rem;
width: 18rem; height: 18rem;
background: rgba(154,123,61, 0.28);
filter: blur(56px);
opacity: 0.22;

/* Mist Orb */
top: 8rem; left: -4rem;
background: rgba(107,91,122, 0.24);

/* Forest Orb */
bottom: 8rem; left: 35%;
background: rgba(30,92,66, 0.20);
```

### Gradient Border (حدود التدرج)
```css
.gradient-border::before {
  background: linear-gradient(135deg,
    rgba(154,123,61, 0.30),
    transparent 40%,
    transparent 60%,
    rgba(154,123,61, 0.20)
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}
```

### Section Divider
```css
.section-divider {
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    var(--wusha-border-strong),
    transparent
  );
}

.gold-accent-line {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(154,123,61, 0.25) 20%,
    rgba(184,150,79, 0.60) 50%,
    rgba(154,123,61, 0.25) 80%,
    transparent 100%
  );
}
```

---

## 10 · المكوّن الرئيسي (Hero)

### خلفية الـ Hero — وضعان

**وضع Shader (الافتراضي):**
- تأثير بصري مولَّد ببرمجة WebGL / Canvas
- طبقة دخان متحركة (`.shader-smoke-layer`) بثلاث كرات دوّارة
- مدة: 30–44 ثانية لكل دورة
- Blend mode: `multiply` (فاتح) / `screen` (داكن)

**وضع Video:**
- فيديو `/public/videos/HERO1.mp4` كخلفية كاملة
- `object-fit: cover` مع إيقاف الضوابط
- طبقة gradient overlay للنص

### بنية Hero
```
Hero Section
├── ShaderWallpaperBackground (خلفية شيدر)
│   ├── shader-wallpaper-bg     (التدرج الأساسي)
│   ├── shader-wallpaper-canvas (WebGL canvas)
│   └── shader-smoke-layer      (3 كرات دخان)
├── Logo + Halo (الشعار مع هالته)
├── Tagline / Hero Text
└── CTA Buttons (btn-gold + btn-secondary)
```

### ألوان الـ Hero

```css
/* Light */
--hero-tagline-text: rgba(75,52,52, 0.88);
--hero-subtitle:     #4b3434;
--hero-title-glow:
  0 1px 0 rgba(255,246,236, 0.7),
  0 0 26px rgba(75,52,52, 0.18),
  0 16px 44px rgba(75,52,52, 0.14);

/* Dark */
--hero-tagline-text: rgba(246,221,186, 0.78);
--hero-subtitle:     #e0c99a;
--hero-title-glow:
  0 0 24px rgba(224,201,154, 0.34),
  0 0 72px rgba(206,174,127, 0.12),
  0 14px 50px rgba(0,0,0, 0.36);
```

---

## 11 · الهيدر والتنقل

### بنية الـ Header

```css
/* Overlay خلفية الهيدر */
--header-overlay-bg: rgba(249,237,228, 0.90);   /* Light */
--header-overlay-bg: rgba(9,6,6, 0.92);          /* Dark */

/* لوحة الـ Surface */
--header-surface-gradient: linear-gradient(180deg,
  rgba(255,247,240, 0.90),
  rgba(232,211,199, 0.72)
);

/* ظل اللوحة */
--header-surface-panel-shadow:
  0 24px 70px rgba(75,52,52, 0.16),
  inset 0 1px 0 rgba(255,250,244, 0.56);

/* خط الفصل */
--header-line-gradient: linear-gradient(90deg,
  transparent,
  rgba(75,52,52, 0.22),
  rgba(202,164,95, 0.24),
  transparent
);
```

### Chips التنقل

```css
--header-chip-bg:           rgba(75,52,52, 0.065);
--header-chip-border:        rgba(75,52,52, 0.13);
--header-chip-text:          rgba(61,42,42, 0.76);
--header-chip-active-bg:     rgba(75,52,52, 0.13);
--header-chip-active-border: rgba(75,52,52, 0.24);
```

### أزرار التحكم

```css
.theme-icon-button {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  background: var(--header-control-bg);
  border: 1px solid var(--header-control-border);

  /* Hover */
  color: var(--wusha-gold);
  transform: translateY(-1px);

  /* Active */
  transform: translateY(0) scale(0.96);
}
```

### CTA الهيدر

```css
--header-cta-bg: radial-gradient(circle at 82% 12%,
  rgba(202,164,95, 0.22), transparent 44%),
  linear-gradient(180deg,
    rgba(255,247,240, 0.98),
    rgba(232,211,199, 0.78)
  );
--header-cta-text:   #4b3434;
--header-cta-border: rgba(75,52,52, 0.18);
--header-cta-shadow:
  0 14px 34px rgba(75,52,52, 0.14),
  inset 0 1px 0 rgba(255,250,244, 0.72);
```

---

## 12 · الفوتر (Footer)

```css
/* Light */
--footer-bg:     #f6efe6;
--footer-text:   rgba(26,22,18, 0.80);
--footer-border: rgba(154,123,61, 0.10);

/* Dark */
--footer-bg:     #0b0b0b;
--footer-text:   rgba(240,235,227, 0.80);
--footer-border: rgba(206,174,127, 0.12);

/* Orbs في الفوتر */
--footer-orb-gold: rgba(154,123,61, 0.16);
--footer-orb-mist: rgba(107,91,122, 0.14);
```

---

## 13 · المواد المطبوعة (Print Identity)

### بطاقة العمل (Business Card)

```
الأبعاد: 9cm × 5.5cm (نسبة 1.65:1)
border-radius: 1.6rem
```

**الوجه الأمامي:** الشعار فقط في المنتصف مع توهج خفيف
**الوجه الخلفي:** الاسم + المسمى + رقم الهاتف + البريد + الموقع

```css
/* تفاصيل الطباعة */
الورق: عاجي دافئ مطفي 600 جرام
التشطيب: ختم هوية بارز (Emboss)
الألوان: CMYK مطابق لـ #4b3434 و #caa45f
```

### بطاقة الشكر (Thank You Card)

```
الأبعاد: رأسية (نسبة 1:1.4)
border-radius: 1.7rem
```

المحتوى: شعار + عنوان "شكراً لثقتكم" + رسالة شخصية + رابط الموقع
الأسلوب: يشبه دعوات الأحداث الفاخرة

### بطاقة العناية (Care Instructions)

```
الأبعاد: مربعة أو مستطيلة (450px max-width)
```

تعليمات: الغسيل البارد · قلب القطعة · تجفيف هواء · بدون مبيضات · كي بحذر

### بطاقة التواصل الاجتماعي (Linktree Card)

```
الأبعاد: رأسية (نسبة 9:16)
```

تحتوي: Instagram · X (تويتر) · TikTok · Snapchat · WhatsApp · رابط الموقع

---

## 14 · بطاقات AI — وشّى ذكاء اصطناعي

```css
/* بطاقة الـ AI (Dark Glass على الفاتح) */
--hero-ai-card-bg: linear-gradient(145deg,
  rgba(75,52,52, 0.97),
  rgba(64,43,43, 0.96),
  rgba(36,22,23, 0.98)
);
--hero-ai-card-border:       rgba(225,188,137, 0.34);
--hero-ai-card-border-hover: rgba(241,211,164, 0.56);
--hero-ai-card-title: linear-gradient(135deg, #fff0d0, #d9b777, #f8e2b5);
--hero-ai-card-text:  rgba(255,244,226, 0.88);
--hero-ai-card-status: #d9b777;   /* مؤشر الحالة */
```

---

## 15 · طبقات العمق (Z-index System)

```css
--z-noise:     0;      /* طبقة الضجيج */
--z-base:      1;      /* المحتوى الأساسي */
--z-sticky:    20;     /* الهيدر الثابت */
--z-dropdown:  40;     /* القوائم المنسدلة */
--z-modal:     100;    /* المودال */
--z-skip-link: 500;    /* رابط تخطي للوصول */
```

---

## 16 · الإمكانية (Accessibility)

```css
/* حالة Focus */
:focus-visible {
  outline: 2px solid var(--wusha-gold);
  outline-offset: 2px;
}

/* التحديد النصي */
::selection {
  background-color: var(--wusha-gold);
  color: var(--wusha-bg);
}

/* Scrollbar — Themed */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb {
  background: rgba(154,123,61, 0.30);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--wusha-gold);
}
```

---

## 17 · الشعارات الرقمية (Icons & Favicons)

```
/public/favicon.ico              — متصفحات قديمة
/public/favicon-16x16.png       — شريط التبويب
/public/favicon-32x32.png       — التبويب عالي الدقة
/public/apple-touch-icon.png    — iOS홈
/public/icon-192.png            — PWA Android
/public/icon-512.png            — PWA Splash
```

---

## 18 · التوزيع المسافي للكونتينر

```css
.container-wusha {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;      /* Mobile */
  padding: 0 1.5rem;    /* sm */
  padding: 0 3rem;      /* md+ */
  min-width: 0;
}
```

---

## 19 · المنصة الرقمية — هيكل الواجهات

| الصفحة | الوصف |
|--------|-------|
| `/` | الصفحة الرئيسية — Hero + Store + AI Section |
| `/store` | المتجر — قائمة المنتجات مع الفلترة |
| `/gallery` | معرض الأعمال الفنية |
| `/design` | صفحة الطباعة المخصصة |
| `/design/washa-ai` | استوديو الذكاء الاصطناعي |
| `/join` | انضم كفنان |
| `/artists/:username` | صفحة الفنان |
| `/account` | حساب المستخدم |
| `/studio` | استوديو الفنان |
| `/dashboard` | لوحة الإدارة |
| `/brand` | أصول الهوية البصرية |

---

## 20 · الرسالة والصوت (Voice & Tone)

### الأسلوب اللغوي
- **عربي فصيح حيّ** — ليس رسمياً جافاً، وليس عامياً
- الإيجاز: جمل قصيرة، كلمات ذات ثقل بصري
- حضور الهوية: "وشّى" تُكتب دائماً مع التشكيل
- الشعار الدائم: **فنٌّ يُرتدى**

### عبارات موقَّعة
- "نحن في وشّى نصنع الفن بحُبّ وإتقان"
- "التفاصيل تصنع الفارق"
- "فنّانو المملكة في كلّ نسيج"
- "صمّم بصمتك، ارتدِ هويّتك"

---

## 21 · مراجعة سريعة — قائمة التحقق

```
✓ الشعار موجود على أبيض، أسود، وذهبي
✓ الألوان موثقة في light و dark mode
✓ الخطوط: TheYearOfTheCamel بجميع أوزانه
✓ glass-card و glass-premium موثقان
✓ btn-gold كزر CTA رئيسي
✓ Noise overlay خفيفة على كل السطوح
✓ Shimmer effect على الأزرار والكروت
✓ Z-index منظم ومتسق
✓ RTL كامل (dir="rtl")
✓ focus-visible بالذهب
✓ prefers-reduced-motion محترَم
✓ المواد المطبوعة: 4 بطاقات موثقة
✓ PWA icons موجودة
```

---

*الملف محدَّث: مايو 2026 — إصدار 7.07*
*المنصة: Next.js 14 · Supabase · Clerk · Framer Motion · Tailwind CSS*

---

```
وشّى · washa.shop
فنٌّ يُرتدى — Art You Wear
```
