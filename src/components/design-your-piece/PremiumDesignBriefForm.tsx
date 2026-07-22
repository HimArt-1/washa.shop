"use client";

import {
    CheckIcon,
    DimensionsIcon,
    DrawingPinIcon,
    FontFamilyIcon,
    ImageIcon,
    MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import {
    getPremiumDesignBriefPlacementError,
    premiumBackgroundHex,
    premiumDesignBriefSchema,
    premiumPrintPlacementConstraints,
    type PremiumDesignBrief,
    type PremiumPrintPosition,
} from "@/lib/premium-design-request";

type Props = {
    value: PremiumDesignBrief;
    printPosition: PremiumPrintPosition;
    onChange: (patch: Partial<PremiumDesignBrief>) => void;
};

const inputClass = "w-full rounded-xl border border-theme-soft bg-theme-subtle px-4 py-3 text-sm text-theme outline-none transition-[border-color,background-color,transform] duration-200 placeholder:text-theme-faint focus:border-gold/50 focus:bg-theme-faint aria-[invalid=true]:border-red-400/50";
const selectClass = `${inputClass} appearance-none`;

const compositionOptions: Array<{ value: PremiumDesignBrief["composition"]; label: string }> = [
    { value: "centered", label: "متمركز" },
    { value: "diagonal", label: "قطري" },
    { value: "vertical", label: "رأسي" },
    { value: "horizontal", label: "أفقي" },
    { value: "asymmetrical", label: "غير متماثل" },
];

const movementOptions: Array<{ value: PremiumDesignBrief["visualMovement"]; label: string }> = [
    { value: "center_outward", label: "من المركز إلى الخارج" },
    { value: "lower_left_to_upper_right", label: "من أسفل اليسار إلى أعلى اليمين" },
    { value: "left_to_right", label: "من اليسار إلى اليمين" },
    { value: "bottom_to_top", label: "من الأسفل إلى الأعلى" },
];

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="grid gap-2">
            <span className="text-sm font-bold text-theme">{label}</span>
            {children}
            <span className={`min-h-5 text-xs leading-5 ${error ? "text-red-300" : "text-theme-faint"}`}>
                {error || hint || ""}
            </span>
        </label>
    );
}

function SectionTitle({
    icon: Icon,
    index,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    index: string;
    title: string;
    description: string;
}) {
    return (
        <div className="mb-6 grid grid-cols-[36px_minmax(0,1fr)] gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-gold/25 bg-gold/[0.06] text-gold">
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-gold">{index}</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-theme">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-theme-subtle">{description}</p>
            </div>
        </div>
    );
}

export function PremiumDesignBriefForm({ value, printPosition, onChange }: Props) {
    const parsed = premiumDesignBriefSchema.safeParse(value);
    const errors = new Map<string, string>();
    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            const key = String(issue.path[0] ?? "");
            if (key && !errors.has(key)) errors.set(key, issue.message);
        }
    }
    const placementError = parsed.success
        ? getPremiumDesignBriefPlacementError(parsed.data, printPosition)
        : null;
    const placementConstraints = premiumPrintPlacementConstraints[printPosition];

    const requiredFields = ["designIdea", "mainSubject", "detailOne", "detailTwo"];
    const completedRequired = requiredFields.filter((field) => !errors.has(field)).length;
    const printFinishOptions: Array<{ value: PremiumDesignBrief["printFinish"]; label: string }> = [
        { value: "matte", label: "مطفي" },
        { value: "soft_hand", label: "ملمس ناعم" },
        { value: "metallic", label: "معدني" },
        { value: "puff", label: "بارز Puff" },
        { value: "custom", label: "مخصص" },
    ];

    return (
        <div className="mt-7 border-t border-theme-soft pt-7">
            <div className="mb-8 grid gap-4 border-y border-theme-soft py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-gold">DESIGN BRIEF / PRODUCTION BOARD</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-theme">حوّل الفكرة إلى مواصفة قابلة للتنفيذ</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-theme-subtle">
                        هذه التفاصيل تبني لوحة اعتماد 4:5 من أربع مناطق. سيحوّلها النظام داخليًا إلى تعليمات إنتاج دقيقة.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-theme-subtle">
                    <span className="font-mono text-gold">{completedRequired}/{requiredFields.length}</span>
                    حقول أساسية مكتملة
                </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="divide-y divide-theme-soft">
                    <section className="pb-9">
                        <SectionTitle
                            icon={DrawingPinIcon}
                            index="01 / CONCEPT"
                            title="قصة التصميم"
                            description="صف المشهد والعناصر كما تريد أن تظهر، من دون افتراضات عامة."
                        />
                        <div className="grid gap-5">
                            <Field label="فكرة التصميم الكاملة" hint="اكتب المشهد، الفكرة، والإحساس المطلوب." error={errors.get("designIdea")}>
                                <textarea
                                    value={value.designIdea}
                                    onChange={(event) => onChange({ designIdea: event.target.value })}
                                    placeholder="مثال: بطة أم تطير بين الكواكب وتتبعها صغارها من الأرض نحو الفضاء..."
                                    rows={5}
                                    aria-invalid={errors.has("designIdea")}
                                    className={`${inputClass} resize-y leading-7`}
                                />
                            </Field>
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="العنصر الرئيسي" error={errors.get("mainSubject")}>
                                    <input
                                        value={value.mainSubject}
                                        onChange={(event) => onChange({ mainSubject: event.target.value })}
                                        placeholder="الشخصية أو العنصر الأهم"
                                        aria-invalid={errors.has("mainSubject")}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="العناصر الثانوية" hint="اختياري">
                                    <input
                                        value={value.secondarySubjects}
                                        onChange={(event) => onChange({ secondarySubjects: event.target.value })}
                                        placeholder="شخصيات أو رموز مساندة"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                            <Field label="البيئة والخلفية داخل الرسم" hint="نجوم، عمارة، جبال، فراغ بصري، أو أي عناصر محيطة.">
                                <input
                                    value={value.environment}
                                    onChange={(event) => onChange({ environment: event.target.value })}
                                    placeholder="العناصر البيئية داخل العمل الفني"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="توجيه بصري إضافي" hint="اختياري، ويُدمج مع النمط والأسلوب اللذين ستختارهما لاحقًا.">
                                <input
                                    value={value.visualStyle}
                                    onChange={(event) => onChange({ visualStyle: event.target.value })}
                                    placeholder="مثال: رسم حبري قصصي بطابع مستقبلي هادئ"
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="py-9">
                        <SectionTitle
                            icon={ImageIcon}
                            index="02 / COMPOSITION"
                            title="التكوين ولقطات التفاصيل"
                            description="اختر حركة التصميم وحدد لقطتين مختلفتين للمعاينة المكبّرة."
                        />
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <span className="text-sm font-bold text-theme">اتجاه التكوين</span>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                    {compositionOptions.map((option) => {
                                        const selected = value.composition === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => onChange({ composition: option.value })}
                                                className={`min-h-11 border px-3 py-2 text-xs font-bold transition-[transform,border-color,background-color,color] duration-200 active:scale-[0.98] ${selected ? "border-gold/55 bg-gold/10 text-gold" : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-gold/25 hover:text-theme"}`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <Field label="مسار الحركة البصرية">
                                <select
                                    value={value.visualMovement}
                                    onChange={(event) => onChange({ visualMovement: event.target.value as PremiumDesignBrief["visualMovement"] })}
                                    className={selectClass}
                                >
                                    {movementOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </Field>
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="DETAIL 01" hint="وجه، خط، زهرة، أو ملمس محدد." error={errors.get("detailOne")}>
                                    <input
                                        value={value.detailOne}
                                        onChange={(event) => onChange({ detailOne: event.target.value })}
                                        placeholder="ما الذي نكبّره في اللوحة الأولى؟"
                                        aria-invalid={errors.has("detailOne")}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="DETAIL 02" hint="يجب أن تكون لقطة مختلفة تمامًا." error={errors.get("detailTwo")}>
                                    <input
                                        value={value.detailTwo}
                                        onChange={(event) => onChange({ detailTwo: event.target.value })}
                                        placeholder="ما الذي نكبّره في اللوحة الثانية؟"
                                        aria-invalid={errors.has("detailTwo")}
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section className="py-9">
                        <SectionTitle
                            icon={DimensionsIcon}
                            index="03 / FIT & SCALE"
                            title="المنظور والمقاس الفعلي"
                            description="المقاسات بالسنتيمتر وتظهر داخل دليل القياس على لوحة الاعتماد."
                        />
                        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1fr]">
                            <div className="grid gap-2">
                                <span className="text-sm font-bold text-theme">منظور القطعة</span>
                                <div className="flex min-h-12 items-center border border-theme-soft bg-theme-subtle px-4 text-sm font-bold text-gold">
                                    {placementConstraints.garmentView === "front" ? "أمام — مرتبط بموضع الطباعة" : "خلف — مرتبط بموضع الطباعة"}
                                </div>
                            </div>
                            <Field label="العرض (سم)" error={errors.get("designWidth")}>
                                <input
                                    type="number"
                                    min={5}
                                    max={placementConstraints.maxWidth}
                                    step={0.5}
                                    value={value.designWidth}
                                    onChange={(event) => onChange({ designWidth: Number(event.target.value) })}
                                    aria-invalid={errors.has("designWidth")}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>
                            <Field label="الارتفاع (سم)" error={errors.get("designHeight")}>
                                <input
                                    type="number"
                                    min={5}
                                    max={placementConstraints.maxHeight}
                                    step={0.5}
                                    value={value.designHeight}
                                    onChange={(event) => onChange({ designHeight: Number(event.target.value) })}
                                    aria-invalid={errors.has("designHeight")}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>
                        </div>
                        <p className={`mt-3 text-xs ${placementError ? "text-red-300" : "text-theme-faint"}`}>
                            {placementError || `حد الإنتاج لهذا الموضع: ${placementConstraints.maxWidth} × ${placementConstraints.maxHeight} سم.`}
                        </p>
                    </section>

                    <section className="py-9">
                        <SectionTitle
                            icon={FontFamilyIcon}
                            index="04 / TYPE"
                            title="النص داخل التصميم"
                            description="اترك الحقول فارغة عندما لا تريد نصًا؛ لن يضيف النظام عبارات من عنده."
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="النص الرئيسي" hint="اختياري، وسيُطلب مطابقته حرفيًا.">
                                <input
                                    value={value.mainText}
                                    onChange={(event) => onChange({ mainText: event.target.value })}
                                    placeholder="بدون نص"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="النص الثانوي" hint="اختياري">
                                <input
                                    value={value.secondaryText}
                                    onChange={(event) => onChange({ secondaryText: event.target.value })}
                                    placeholder="بدون نص"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="أسلوب الخط">
                                <select
                                    value={value.typographyStyle}
                                    onChange={(event) => onChange({ typographyStyle: event.target.value as PremiumDesignBrief["typographyStyle"] })}
                                    className={selectClass}
                                >
                                    <option value="modern_sans_serif">Sans Serif حديث</option>
                                    <option value="condensed">مكثف Condensed</option>
                                    <option value="serif">Serif</option>
                                    <option value="arabic_calligraphy">خط عربي</option>
                                    <option value="monospace">Monospace</option>
                                    <option value="custom">مخصص</option>
                                </select>
                            </Field>
                        </div>
                    </section>

                    <section className="pt-9">
                        <SectionTitle
                            icon={MixerHorizontalIcon}
                            index="05 / PRODUCTION"
                            title="الطباعة وخلفية العرض"
                            description="مواصفات دمج الحبر والخلفية المحايدة في لوحة الموافقة."
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="موضع القطعة في لوحة العرض" hint="يمكن وضع الـ Hero يساراً أو يميناً أو في المنتصف.">
                                <select
                                    value={value.heroPosition}
                                    onChange={(event) => onChange({ heroPosition: event.target.value as PremiumDesignBrief["heroPosition"] })}
                                    className={selectClass}
                                >
                                    <option value="left">الجانب الأيسر</option>
                                    <option value="right">الجانب الأيمن</option>
                                    <option value="center">المنتصف</option>
                                </select>
                            </Field>
                            <Field label="طريقة الطباعة">
                                <select
                                    value={value.printMethod}
                                    onChange={(event) => onChange({ printMethod: event.target.value as PremiumDesignBrief["printMethod"] })}
                                    className={selectClass}
                                >
                                    <option value="dtf">DTF</option>
                                    <option value="screen_print">Screen Print</option>
                                    <option value="embroidery">تطريز</option>
                                    <option value="mixed">تقنية مختلطة</option>
                                </select>
                            </Field>
                            <Field label="تشطيب الطباعة">
                                <select
                                    value={value.printFinish}
                                    onChange={(event) => onChange({ printFinish: event.target.value as PremiumDesignBrief["printFinish"] })}
                                    className={selectClass}
                                >
                                    {printFinishOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </Field>
                            {value.printFinish === "custom" ? (
                                <Field label="التشطيب المخصص" error={errors.get("customPrintFinish")}>
                                    <input
                                        value={value.customPrintFinish}
                                        onChange={(event) => onChange({ customPrintFinish: event.target.value })}
                                        placeholder="صف اللمعة أو الملمس المطلوب"
                                        aria-invalid={errors.has("customPrintFinish")}
                                        className={inputClass}
                                    />
                                </Field>
                            ) : null}
                            <Field label="خلفية لوحة العرض">
                                <select
                                    value={value.background}
                                    onChange={(event) => {
                                        const background = event.target.value as PremiumDesignBrief["background"];
                                        onChange({
                                            background,
                                            backgroundColor: premiumBackgroundHex[background],
                                        });
                                    }}
                                    className={selectClass}
                                >
                                    <option value="ice_vanilla">Ice Vanilla</option>
                                    <option value="light_beige">Light Beige</option>
                                    <option value="soft_concrete">Soft Concrete</option>
                                    <option value="muted_charcoal">Muted Charcoal</option>
                                </select>
                            </Field>
                            <Field label="لون الخلفية أو HEX" hint="يُستخدم كمرجع لوني دقيق.">
                                <input
                                    value={value.backgroundColor}
                                    onChange={(event) => onChange({ backgroundColor: event.target.value })}
                                    placeholder="#F4F0E6"
                                    dir="ltr"
                                    className={`${inputClass} font-mono text-left`}
                                />
                            </Field>
                        </div>
                        <div className="mt-5">
                            <Field label="تعليمات إضافية" hint="اختياري: قيود أو تفاصيل لا تغطيها الحقول السابقة.">
                                <textarea
                                    value={value.additionalInstructions}
                                    onChange={(event) => onChange({ additionalInstructions: event.target.value })}
                                    placeholder="أي ملاحظات إنتاجية أو فنية إضافية"
                                    rows={3}
                                    className={`${inputClass} resize-y leading-7`}
                                />
                            </Field>
                        </div>
                    </section>
                </div>

                <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
                    <div className="border border-theme-soft bg-theme-subtle p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-theme-subtle">BOARD MAP</span>
                            <span className="font-mono text-[10px] text-gold">4:5</span>
                        </div>
                        <div className="aspect-[4/5] border border-theme-soft bg-theme-faint p-2">
                            <div className="grid h-[62%] grid-cols-[2fr_1fr] gap-1.5">
                                <div className="flex items-end border border-gold/30 bg-gold/[0.07] p-2">
                                    <span className="font-mono text-[9px] font-bold text-gold">HERO / 01</span>
                                </div>
                                <div className="grid grid-rows-2 gap-1.5">
                                    <div className="flex items-end border border-theme-soft bg-theme-subtle p-2"><span className="font-mono text-[8px] text-theme-subtle">DETAIL 01</span></div>
                                    <div className="flex items-end border border-theme-soft bg-theme-subtle p-2"><span className="font-mono text-[8px] text-theme-subtle">DETAIL 02</span></div>
                                </div>
                            </div>
                            <div className="mt-1.5 flex h-[calc(38%-6px)] items-end justify-between border border-theme-soft bg-theme-subtle p-2">
                                <span className="font-mono text-[8px] text-theme-subtle">FULL DESIGN</span>
                                <span className="font-mono text-[8px] text-theme-faint">{value.designWidth} × {value.designHeight} CM</span>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2 border-t border-theme-soft pt-4">
                            <div className="flex items-center gap-2 text-xs text-theme-subtle">
                                <CheckIcon className="h-3.5 w-3.5 text-gold" /> أربع مناطق ثابتة
                            </div>
                            <div className="flex items-center gap-2 text-xs text-theme-subtle">
                                <CheckIcon className="h-3.5 w-3.5 text-gold" /> تصميم موحّد بين كل اللقطات
                            </div>
                            <div className="flex items-center gap-2 text-xs text-theme-subtle">
                                <CheckIcon className="h-3.5 w-3.5 text-gold" /> قياسات وإنتاج DTF
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
