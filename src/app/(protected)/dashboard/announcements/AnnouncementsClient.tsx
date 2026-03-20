"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff, Clock, Megaphone,
    Calendar, Link as LinkIcon, ArrowUpDown, Zap, AlertTriangle, Gift,
    Sparkles, ChevronDown, Save, Search, Target, Timer, LogOut,
    MousePointerClick, ArrowDown, Globe2, ImagePlus, Clapperboard,
} from "lucide-react";
import {
    createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementActive, uploadAnnouncementMedia,
} from "@/app/actions/announcements";
import {
    type Announcement, type AnnouncementEngagementSnapshot, type AnnouncementTrigger, type TriggerType,
    PAGE_OPTIONS, DEFAULT_TRIGGER, getAnnouncementDismissLabel,
} from "@/lib/announcement-types";

// ─── Template Definitions ───────────────────────────────

const templates = [
    {
        id: "gold" as const,
        label: "ذهبي فاخر",
        family: "Luxury",
        description: "رسائل العروض الراقية والكوبونات الرسمية والإطلاقات الذهبية.",
        kicker: "Private Offer",
        headlineHint: "مثال: امتياز خاص لأعضاء وشّى",
        bodyHint: "اكتب رسالة قصيرة تعكس الندرة والقيمة العالية دون مبالغة.",
        preview: "bg-gradient-to-r from-[#5A3E2B] via-[#ceae7f] to-[#5A3E2B] text-theme",
        icon: Sparkles,
    },
    {
        id: "gradient" as const,
        label: "متدرج حيوي",
        family: "Momentum",
        description: "حملات تنشيطية وإطلاقات شبابية تحتاج طاقة بصرية مباشرة.",
        kicker: "Live Momentum",
        headlineHint: "مثال: الإطلاق بدأ الآن",
        bodyHint: "استخدم إيقاعًا سريعًا ورسالة واضحة تدفع إلى التفاعل مباشرة.",
        preview: "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-theme",
        icon: Zap,
    },
    {
        id: "minimal" as const,
        label: "بسيط أنيق",
        family: "Clean",
        description: "إشعارات هادئة ورسائل واضحة بلا ازدحام بصري.",
        kicker: "Clean Note",
        headlineHint: "مثال: تحديث هادئ للتجربة",
        bodyHint: "ركّز على جملة واحدة مباشرة مع أقل قدر من الزخرفة اللفظية.",
        preview: "bg-theme-faint border border-theme-subtle text-theme-strong",
        icon: Eye,
    },
    {
        id: "alert" as const,
        label: "تنبيه عاجل",
        family: "Urgent",
        description: "رسائل سريعة للحالات الحرجة أو التنبيهات الحساسة للوقت.",
        kicker: "Action Required",
        headlineHint: "مثال: آخر ساعات العرض",
        bodyHint: "اكتب تنبيهًا واضحًا ومحددًا زمنيًا مع سبب مباشر لاتخاذ الإجراء.",
        preview: "bg-red-500/10 border border-red-500/30 text-red-400",
        icon: AlertTriangle,
    },
    {
        id: "promo" as const,
        label: "عرض ترويجي",
        family: "Commerce",
        description: "حملات المتجر وتفعيل العروض الموسمية والخصومات.",
        kicker: "Store Campaign",
        headlineHint: "مثال: خصم موسمي على القطع المختارة",
        bodyHint: "اجعل العرض ملموسًا: ما الفائدة؟ لمن؟ ولماذا الآن؟",
        preview: "bg-gradient-to-r from-emerald-600 to-teal-500 text-theme",
        icon: Gift,
    },
    {
        id: "neon" as const,
        label: "نيون زجاجي",
        family: "Digital",
        description: "إحساس تقني لافت للمنتجات الحديثة والتنبيهات النابضة.",
        kicker: "Digital Pulse",
        headlineHint: "مثال: تجربة جديدة وصلت الآن",
        bodyHint: "الأسلوب هنا تقني وحيوي؛ اجعل الرسالة حادة وسريعة.",
        preview: "bg-blue-500/[0.08] border border-blue-400/20 text-blue-200 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.15)]",
        icon: Zap,
    },
    {
        id: "sunset" as const,
        label: "غروب دافئ",
        family: "Warm",
        description: "قالب ناعم للعروض المحدودة ورسائل الضيافة والعناية.",
        kicker: "Warm Drop",
        headlineHint: "مثال: لمسة موسمية أخف وأقرب",
        bodyHint: "اجعل النص ودودًا ومرنًا ويعطي إحساس الضيافة لا الضغط.",
        preview: "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-400/15 text-amber-100 backdrop-blur-sm",
        icon: Sparkles,
    },
    {
        id: "frost" as const,
        label: "صقيع لامع",
        family: "Glass",
        description: "إعلانات شفافة راقية مع طابع زجاجي خفيف ومترف.",
        kicker: "Glass Signal",
        headlineHint: "مثال: دعوة راقية بتفاصيل خفيفة",
        bodyHint: "استخدم لغة ناعمة ومختصرة تليق بالسطح الشفاف والفاخر.",
        preview: "bg-theme-soft border border-theme-soft text-theme-strong backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)]",
        icon: Eye,
    },
    {
        id: "rose" as const,
        label: "وردي ناعم",
        family: "Soft",
        description: "ملائم لقصص المجتمع ورسائل الهوية الناعمة والعاطفية.",
        kicker: "Community Story",
        headlineHint: "مثال: رسالة أقرب إلى المجتمع",
        bodyHint: "اكتب بنبرة إنسانية ناعمة تشعر المستخدم بأنه جزء من القصة.",
        preview: "bg-gradient-to-r from-pink-500/10 via-rose-400/10 to-fuchsia-500/10 border border-pink-400/15 text-pink-200 backdrop-blur-sm",
        icon: Gift,
    },
    {
        id: "aurora" as const,
        label: "شفق قطبي",
        family: "Atmosphere",
        description: "قالب غني باللون للحملات الملهمة والقصص الفنية.",
        kicker: "Atmosphere",
        headlineHint: "مثال: تجربة جديدة بطابع ملهم",
        bodyHint: "استخدم لغة تصويرية مختصرة تمنح الحملة مزاجًا وليس مجرد عرض.",
        preview: "bg-gradient-to-r from-violet-600/15 via-cyan-500/15 to-emerald-500/15 border border-violet-400/15 text-cyan-100 backdrop-blur-md",
        icon: Sparkles,
    },
    {
        id: "spotlight" as const,
        label: "سبوت لايت",
        family: "Feature",
        description: "لتسليط الضوء على إطلاق رئيسي أو قطعة محورية بلمسة فاخرة.",
        kicker: "Featured Drop",
        headlineHint: "مثال: القطعة التي تقود هذا الموسم",
        bodyHint: "تعامل مع الإعلان كواجهة رئيسية لقطعة أو إطلاق يستحق الضوء الكامل.",
        preview: "bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.2),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(247,241,230,0.98))] border border-[#ceae7f]/30 text-[#3b2c1d]",
        icon: Sparkles,
    },
    {
        id: "cinema" as const,
        label: "سينمائي",
        family: "Motion",
        description: "الأفضل للفيديوهات والتريلرات والحملات ذات الطابع القصصي.",
        kicker: "Trailer Drop",
        headlineHint: "مثال: مشهد جديد من عالم وشّى",
        bodyHint: "اكتب كما لو كنت تطلق teaser قصيرًا: صورة واضحة، إيقاع قصصي، CTA محسوب.",
        preview: "bg-[linear-gradient(135deg,rgba(15,15,20,0.97),rgba(36,24,14,0.94))] border border-amber-400/20 text-amber-50",
        icon: Clapperboard,
    },
    {
        id: "editorial" as const,
        label: "إيديتوريال",
        family: "Press",
        description: "قالب تحريري أنيق لرسائل الموضة والقصة والهوية.",
        kicker: "Editor's Note",
        headlineHint: "مثال: افتتاحية هذا الأسبوع",
        bodyHint: "النبرة هنا تحريرية؛ اجعل النص أنيقًا ويشبه افتتاحية مجلة مختصرة.",
        preview: "bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(233,239,246,0.98))] border border-slate-300/70 text-slate-900",
        icon: Eye,
    },
    {
        id: "atelier" as const,
        label: "أتيليه",
        family: "Craft",
        description: "إحساس حرفي راقٍ لورش التصميم والحملات المخصصة والطلبات الخاصة.",
        kicker: "Atelier Session",
        headlineHint: "مثال: صمّمها كما تشتهيها",
        bodyHint: "اكتب بنبرة حرفية وتخصيصية تشعر المستخدم بأن العمل صُنِع له.",
        preview: "bg-[linear-gradient(135deg,rgba(250,246,238,0.98),rgba(229,220,205,0.98))] border border-stone-300/70 text-[#2f2418]",
        icon: Eye,
    },
    {
        id: "monogram" as const,
        label: "مونوغرام",
        family: "Signature",
        description: "قالب ترفيهي فاخر بطابع دار أزياء مميز للحملات الراقية.",
        kicker: "Maison Signal",
        headlineHint: "مثال: توقيع هذا الإطلاق",
        bodyHint: "استخدم لغة دار أزياء: ثقة، أناقة، وندرة محسوبة.",
        preview: "bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_32%),linear-gradient(135deg,rgba(13,22,18,0.98),rgba(34,54,44,0.95))] border border-[#ceae7f]/25 text-[#f5ecd9]",
        icon: Sparkles,
    },
    {
        id: "obsidian" as const,
        label: "أوبسيديان",
        family: "Noir",
        description: "قالب داكن احترافي للإطلاقات القوية والتنبيهات ذات الهيبة العالية.",
        kicker: "Night Edition",
        headlineHint: "مثال: إطلاق الليلة",
        bodyHint: "رسالة مركزة وجادة بإيقاع واثق وهيبة بصرية عالية.",
        preview: "bg-[linear-gradient(135deg,rgba(7,10,19,0.98),rgba(17,29,53,0.95))] border border-cyan-400/20 text-cyan-50",
        icon: Clapperboard,
    },
    {
        id: "pearl" as const,
        label: "لؤلؤي",
        family: "Soft Luxe",
        description: "سطح فاتح متوهج للحملات الأنثوية والرسائل الراقية الهادئة.",
        kicker: "Soft Reveal",
        headlineHint: "مثال: إطلاق ناعم بلمسة راقية",
        bodyHint: "اجعل الرسالة رقيقة ومترفة وقريبة من حس الاكتشاف الهادئ.",
        preview: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(252,244,255,0.98)),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,236,255,0.94))] border border-fuchsia-200/60 text-[#563b63]",
        icon: Gift,
    },
    {
        id: "kinetic" as const,
        label: "كينيتك",
        family: "Campaign",
        description: "قالب سريع وحيوي للحملات المكثفة والإطلاقات قصيرة الأمد.",
        kicker: "Flash Motion",
        headlineHint: "مثال: نافذة الحملة بدأت",
        bodyHint: "استخدم إيقاعًا حركيًا واضحًا مع CTA مباشر وإحساس بعجلة محسوبة.",
        preview: "bg-[linear-gradient(120deg,rgba(255,96,96,0.22),rgba(255,190,73,0.22),rgba(99,102,241,0.22))] border border-orange-300/30 text-[#3b1f1f]",
        icon: Zap,
    },
] as const;

const typeLabels: Record<string, { label: string; icon: any }> = {
    banner: { label: "شريط علوي", icon: Megaphone },
    popup: { label: "نافذة منبثقة", icon: Eye },
    toast: { label: "إشعار سريع", icon: Zap },
    marquee: { label: "شريط متحرك", icon: ArrowUpDown },
};

const triggerLabels: Record<TriggerType, { label: string; desc: string; icon: any }> = {
    on_load: { label: "عند الدخول", desc: "يظهر فوراً عند فتح الموقع", icon: Globe2 },
    after_delay: { label: "بعد مدة", desc: "يظهر بعد مرور وقت محدد", icon: Timer },
    page_enter: { label: "دخول صفحة", desc: "يظهر عند الانتقال لصفحة معينة", icon: MousePointerClick },
    exit_intent: { label: "نية المغادرة", desc: "يظهر عند محاولة مغادرة الصفحة", icon: LogOut },
    scroll_depth: { label: "عمق التمرير", desc: "يظهر بعد التمرير لنسبة من الصفحة", icon: ArrowDown },
    always: { label: "دائماً", desc: "يظهر في كل صفحة بشكل مستمر", icon: Target },
};

const frequencyLabels: Record<string, string> = {
    once: "مرة واحدة فقط",
    session: "كل جلسة",
    always: "في كل مرة",
};

const layoutModeLabels: Record<NonNullable<Announcement["layoutMode"]>, { label: string; desc: string }> = {
    classic: { label: "كلاسيكي", desc: "رسالة متوازنة مع وسيط اختياري دون تقسيم بصري ثقيل." },
    hero: { label: "Hero", desc: "حضور أقوى للوسيط والعنوان عند إطلاق حملة رئيسية." },
    split: { label: "Split", desc: "تقسيم واضح بين الوسيط والمحتوى للحملات المركزة." },
    compact: { label: "Compact", desc: "صيغة خفيفة للرسائل السريعة والتنبيهات المختصرة." },
};

function buildDefaultAnnouncementForm() {
    return {
        title: "",
        body: "",
        type: "banner" as Announcement["type"],
        layoutMode: "classic" as NonNullable<Announcement["layoutMode"]>,
        template: "gold" as Announcement["template"],
        link: "",
        linkText: "",
        dismissText: "",
        mediaUrl: "",
        mediaType: undefined as Announcement["mediaType"] | undefined,
        mediaPosterUrl: "",
        mediaAlt: "",
        isActive: true,
        startDate: "",
        endDate: "",
        priority: 0,
        trigger: { ...DEFAULT_TRIGGER } as AnnouncementTrigger,
    };
}

function AnnouncementMediaPreview({
    url,
    mediaType,
    posterUrl,
    title,
    className,
    controls = false,
}: {
    url?: string;
    mediaType?: Announcement["mediaType"];
    posterUrl?: string;
    title: string;
    className: string;
    controls?: boolean;
}) {
    if (!url) return null;

    if (mediaType === "video") {
        return (
            <video
                src={url}
                className={className}
                muted
                loop
                playsInline
                autoPlay
                controls={controls}
                poster={posterUrl}
            />
        );
    }

    return <img src={url} alt={title} className={className} />;
}

function AnnouncementLivePreview({
    form,
    previewClassName,
}: {
    form: ReturnType<typeof buildDefaultAnnouncementForm>;
    previewClassName: string;
}) {
    const media = form.mediaUrl ? (
        <AnnouncementMediaPreview
            url={form.mediaUrl}
            mediaType={form.mediaType}
            posterUrl={form.mediaPosterUrl || undefined}
            title={form.mediaAlt || form.title || "وسيط الإعلان"}
            className={
                form.layoutMode === "compact"
                    ? "h-16 w-16 rounded-2xl object-cover"
                    : form.layoutMode === "split"
                        ? "aspect-[4/3] h-full min-h-[220px] w-full rounded-2xl object-cover"
                        : "aspect-[16/9] w-full rounded-2xl object-cover"
            }
            controls={form.mediaType === "video" && form.layoutMode !== "compact"}
        />
    ) : null;

    if (form.layoutMode === "split") {
        return (
            <div className={`${previewClassName} overflow-hidden rounded-2xl p-4 text-right`}>
                <div className="grid gap-4 md:grid-cols-[0.9fr,1.1fr] md:items-center">
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                        {media || (
                            <div className="flex min-h-[220px] items-center justify-center text-sm opacity-70">
                                مساحة الوسيط في نمط Split
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <span className="inline-flex rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-bold dark:border-white/10 dark:bg-white/10">
                            {layoutModeLabels.split.label}
                        </span>
                        <p className="text-xl font-black">{form.title || "عنوان الإعلان"}</p>
                        <p className="text-sm leading-7 opacity-85">{form.body || "محتوى الإعلان سيظهر هنا..."}</p>
                        {form.linkText ? (
                            <span className="inline-flex rounded-xl bg-black/10 px-4 py-2 text-xs font-bold dark:bg-white/10">
                                {form.linkText}
                            </span>
                        ) : form.trigger.dismissible ? (
                            <span className="inline-flex rounded-xl bg-black/10 px-4 py-2 text-xs font-bold dark:bg-white/10">
                                {getAnnouncementDismissLabel({
                                    title: form.title || "",
                                    body: form.body || "",
                                    type: form.type,
                                    template: form.template,
                                    linkText: "",
                                    dismissText: form.dismissText,
                                })}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    if (form.layoutMode === "hero") {
        return (
            <div className={`${previewClassName} overflow-hidden rounded-2xl p-4 text-center`}>
                <div className="mx-auto max-w-3xl space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                        {media || (
                            <div className="flex aspect-[16/9] items-center justify-center text-sm opacity-70">
                                مساحة الوسيط في نمط Hero
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <span className="inline-flex rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-bold dark:border-white/10 dark:bg-white/10">
                            {layoutModeLabels.hero.label}
                        </span>
                        <p className="text-2xl font-black">{form.title || "عنوان الإعلان"}</p>
                        <p className="mx-auto max-w-2xl text-sm leading-7 opacity-85">{form.body || "محتوى الإعلان سيظهر هنا..."}</p>
                        {form.linkText ? (
                            <span className="inline-flex rounded-xl bg-black/10 px-5 py-2.5 text-xs font-bold dark:bg-white/10">
                                {form.linkText}
                            </span>
                        ) : form.trigger.dismissible ? (
                            <span className="inline-flex rounded-xl bg-black/10 px-5 py-2.5 text-xs font-bold dark:bg-white/10">
                                {getAnnouncementDismissLabel({
                                    title: form.title || "",
                                    body: form.body || "",
                                    type: form.type,
                                    template: form.template,
                                    linkText: "",
                                    dismissText: form.dismissText,
                                })}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    if (form.layoutMode === "compact") {
        return (
            <div className={`${previewClassName} overflow-hidden rounded-2xl p-4`}>
                <div className="flex items-center gap-3 text-right">
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                        {media || (
                            <div className="flex h-16 w-16 items-center justify-center text-[10px] opacity-70">
                                Compact
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{form.title || "عنوان الإعلان"}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-6 opacity-85">{form.body || "محتوى الإعلان سيظهر هنا..."}</p>
                        {form.linkText ? (
                            <span className="mt-2 inline-block text-[11px] font-bold underline">{form.linkText}</span>
                        ) : form.trigger.dismissible ? (
                            <span className="mt-2 inline-block text-[11px] font-bold underline">
                                {getAnnouncementDismissLabel({
                                    title: form.title || "",
                                    body: form.body || "",
                                    type: form.type,
                                    template: form.template,
                                    linkText: "",
                                    dismissText: form.dismissText,
                                })}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${previewClassName} overflow-hidden rounded-2xl px-5 py-4 text-center`}>
            {media && (
                <div className="mb-3 overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                    {media}
                </div>
            )}
            <p className="text-sm font-bold">{form.title || "عنوان الإعلان"}</p>
            <p className="mt-1 text-xs opacity-80">{form.body || "محتوى الإعلان سيظهر هنا..."}</p>
            {form.linkText ? (
                <span className="mt-2 inline-block text-xs font-bold underline">{form.linkText}</span>
            ) : form.trigger.dismissible ? (
                <span className="mt-2 inline-block text-xs font-bold underline">
                    {getAnnouncementDismissLabel({
                        title: form.title || "",
                        body: form.body || "",
                        type: form.type,
                        template: form.template,
                        linkText: "",
                        dismissText: form.dismissText,
                    })}
                </span>
            ) : null}
        </div>
    );
}

const announcementPresets = [
    {
        id: "welcome-popup",
        label: "ترحيب للزوار",
        description: "نافذة افتتاحية للدعوة إلى الانضمام أو اكتشاف الهوية.",
        build: () => ({
            ...buildDefaultAnnouncementForm(),
            title: "مرحبًا بك في وشّى",
            body: "اكتشف القطع الفنية، صمم قطعتك، أو انضم إلى المجتمع لتكون جزءًا من الرحلة.",
            type: "popup" as const,
            layoutMode: "hero" as const,
            template: "pearl" as const,
            link: "/join",
            linkText: "انضم إلى المجتمع",
            priority: 10,
            trigger: { type: "on_load" as const, frequency: "session" as const, dismissible: true },
        }),
    },
    {
        id: "flash-banner",
        label: "عرض عاجل",
        description: "شريط علوي سريع لحملة موسمية أو كود خصم محدود.",
        build: () => ({
            ...buildDefaultAnnouncementForm(),
            title: "عرض محدود لفترة قصيرة",
            body: "استخدم الكود WUSHA10 واحصل على خصم خاص قبل انتهاء الحملة.",
            type: "banner" as const,
            layoutMode: "split" as const,
            template: "kinetic" as const,
            link: "/store",
            linkText: "تسوق الآن",
            priority: 5,
            trigger: { type: "always" as const, frequency: "always" as const, dismissible: true },
        }),
    },
    {
        id: "checkout-toast",
        label: "إنقاذ الدفع",
        description: "تنبيه ذكي داخل المتجر وصفحة الدفع لرفع الإتمام.",
        build: () => ({
            ...buildDefaultAnnouncementForm(),
            title: "لا تفوت طلبك",
            body: "أكمل الدفع الآن واحصل على تجربة شحن أسرع وتحديثات فورية على الطلب.",
            type: "toast" as const,
            layoutMode: "compact" as const,
            template: "sunset" as const,
            link: "/checkout",
            linkText: "إكمال الدفع",
            priority: 20,
            trigger: {
                type: "page_enter" as const,
                frequency: "session" as const,
                dismissible: true,
                targetPages: ["/store", "/checkout"],
            },
        }),
    },
    {
        id: "story-marquee",
        label: "قصة العلامة",
        description: "شريط متحرك خفيف لرفع الهوية أو إبراز إطلاق جديد.",
        build: () => ({
            ...buildDefaultAnnouncementForm(),
            title: "وشّى",
            body: "منصة تدمج الفن والموضة والتجربة المخصصة في رحلة واحدة.",
            type: "marquee" as const,
            template: "monogram" as const,
            link: "/brand",
            linkText: "اكتشف القصة",
            priority: 30,
            trigger: { type: "always" as const, frequency: "always" as const, dismissible: true },
        }),
    },
] as const;

// ─── Main Component ─────────────────────────────────────

export function AnnouncementsClient({
    announcements: initial,
    engagement,
}: {
    announcements: Announcement[];
    engagement: AnnouncementEngagementSnapshot;
}) {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadingPoster, setUploadingPoster] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState(buildDefaultAnnouncementForm);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const resetForm = () => {
        setForm(buildDefaultAnnouncementForm());
        setEditingId(null);
        setShowForm(false);
    };

    const applyPreset = (presetId: string) => {
        const preset = announcementPresets.find((item) => item.id === presetId);
        if (!preset) return;
        setForm(preset.build());
        setEditingId(null);
        setShowForm(true);
    };

    const startEdit = (a: Announcement) => {
        setForm({
            title: a.title, body: a.body, type: a.type, layoutMode: a.layoutMode || "classic", template: a.template,
            link: a.link || "", linkText: a.linkText || "", dismissText: a.dismissText || "", isActive: a.isActive,
            mediaUrl: a.mediaUrl || "", mediaType: a.mediaType, mediaPosterUrl: a.mediaPosterUrl || "", mediaAlt: a.mediaAlt || "",
            startDate: a.startDate ? a.startDate.slice(0, 16) : "",
            endDate: a.endDate ? a.endDate.slice(0, 16) : "",
            priority: a.priority,
            trigger: a.trigger ? { ...a.trigger } : { ...DEFAULT_TRIGGER },
        });
        setEditingId(a.id);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.body.trim()) { showToast("يرجى ملء العنوان والمحتوى"); return; }
        if (form.link.trim() && !form.linkText.trim()) { showToast("أضف نصًا واضحًا للرابط قبل حفظ الإعلان"); return; }
        if (!form.link.trim() && form.linkText.trim()) { showToast("أضف الرابط أولاً أو احذف نص الرابط"); return; }
        if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
            showToast("تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية");
            return;
        }
        if (form.trigger.type === "page_enter" && (!form.trigger.targetPages || form.trigger.targetPages.length === 0)) {
            showToast("اختر صفحة واحدة على الأقل عند استخدام محفّز دخول الصفحة");
            return;
        }
        setLoading(true);

        const payload = {
            title: form.title.trim(),
            body: form.body.trim(),
            type: form.type,
            layoutMode: form.layoutMode,
            template: form.template,
            link: form.link.trim() || undefined,
            linkText: form.linkText.trim() || undefined,
            dismissText: form.dismissText.trim() || undefined,
            mediaUrl: form.mediaUrl.trim() || undefined,
            mediaType: form.mediaUrl ? form.mediaType : undefined,
            mediaPosterUrl: form.mediaType === "video" && form.mediaPosterUrl.trim() ? form.mediaPosterUrl.trim() : undefined,
            mediaAlt: form.mediaAlt.trim() || undefined,
            isActive: form.isActive,
            startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
            endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
            priority: form.priority,
            trigger: form.trigger,
        };

        const result = editingId
            ? await updateAnnouncement(editingId, payload)
            : await createAnnouncement(payload);

        setLoading(false);

        if (result.success) {
            showToast(editingId ? "تم تحديث الإعلان ✓" : "تم إنشاء الإعلان ✓");
            resetForm();
            router.refresh();
        } else {
            showToast("خطأ: " + (result.error || "فشلت العملية"));
        }
    };

    const handleMediaSelected = async (file: File | null) => {
        if (!file) return;
        setUploadingMedia(true);
        try {
            const formData = new FormData();
            formData.set("file", file);
            formData.set("purpose", "media");
            const result = await uploadAnnouncementMedia(formData);
            if (!result.success) {
                showToast("خطأ: " + result.error);
                return;
            }
            setForm((current) => ({
                ...current,
                mediaUrl: result.url,
                mediaType: result.mediaType,
                mediaPosterUrl: result.mediaType === "video" ? current.mediaPosterUrl : "",
                mediaAlt: current.mediaAlt || current.title || file.name.replace(/\.[^.]+$/, ""),
            }));
            showToast(result.mediaType === "video" ? "تم رفع الفيديو ✓" : "تم رفع الوسيط ✓");
        } catch {
            showToast("خطأ: تعذر رفع الوسيط");
        } finally {
            setUploadingMedia(false);
        }
    };

    const handlePosterSelected = async (file: File | null) => {
        if (!file || form.mediaType !== "video") return;
        setUploadingPoster(true);
        try {
            const formData = new FormData();
            formData.set("file", file);
            formData.set("purpose", "poster");
            const result = await uploadAnnouncementMedia(formData);
            if (!result.success) {
                showToast("خطأ: " + result.error);
                return;
            }
            setForm((current) => ({ ...current, mediaPosterUrl: result.url }));
            showToast("تم رفع صورة الغلاف ✓");
        } catch {
            showToast("خطأ: تعذر رفع صورة الغلاف");
        } finally {
            setUploadingPoster(false);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmDeleteId(null);
        setLoading(true);
        const result = await deleteAnnouncement(id);
        setLoading(false);
        if (result.success) { showToast("تم حذف الإعلان ✓"); router.refresh(); }
        else showToast("خطأ: " + result.error);
    };

    const handleToggle = async (id: string) => {
        setLoading(true);
        const result = await toggleAnnouncementActive(id);
        setLoading(false);
        if (result.success) { showToast("تم التبديل ✓"); router.refresh(); }
        else showToast("خطأ: " + (result.error || "تعذر تحديث الإعلان"));
    };

    const updateTrigger = (updates: Partial<AnnouncementTrigger>) => {
        setForm((f) => ({ ...f, trigger: { ...f.trigger, ...updates } }));
    };

    // ─── Stats
    const stats = useMemo(() => {
        const now = new Date();
        const active = initial.filter((a) => {
            if (!a.isActive) return false;
            if (a.startDate && new Date(a.startDate) > now) return false;
            if (a.endDate && new Date(a.endDate) < now) return false;
            return true;
        }).length;
        const scheduled = initial.filter((a) => a.isActive && a.startDate && new Date(a.startDate) > now).length;
        const expired = initial.filter((a) => a.endDate && new Date(a.endDate) < now).length;
        return { total: initial.length, active, scheduled, expired };
    }, [initial]);

    const operationsSnapshot = useMemo(() => {
        const now = new Date();
        const liveNow = initial
            .filter((announcement) => {
                if (!announcement.isActive) return false;
                if (announcement.startDate && new Date(announcement.startDate) > now) return false;
                if (announcement.endDate && new Date(announcement.endDate) < now) return false;
                return true;
            })
            .sort((left, right) => left.priority - right.priority);

        const upcoming = initial
            .filter((announcement) => announcement.isActive && announcement.startDate && new Date(announcement.startDate) > now)
            .sort((left, right) => new Date(left.startDate || "").getTime() - new Date(right.startDate || "").getTime());

        const typeMix = liveNow.reduce<Record<Announcement["type"], number>>(
            (acc, announcement) => {
                acc[announcement.type] += 1;
                return acc;
            },
            { banner: 0, popup: 0, toast: 0, marquee: 0 }
        );

        const triggerMix = liveNow.reduce<Record<TriggerType, number>>(
            (acc, announcement) => {
                acc[announcement.trigger.type] += 1;
                return acc;
            },
            { on_load: 0, after_delay: 0, page_enter: 0, exit_intent: 0, scroll_depth: 0, always: 0 }
        );

        const routeTargets = PAGE_OPTIONS.map((page) => ({
            ...page,
            count: liveNow.filter(
                (announcement) =>
                    announcement.trigger.type === "page_enter" &&
                    announcement.trigger.targetPages?.includes(page.value)
            ).length,
        }))
            .filter((page) => page.count > 0)
            .sort((left, right) => right.count - left.count);

        const warnings: string[] = [];
        if (liveNow.filter((announcement) => announcement.type === "popup").length > 1) {
            warnings.push("يوجد أكثر من Popup نشط حاليًا. سيظهر الأعلى أولوية فقط في الواجهة.");
        }
        if (liveNow.filter((announcement) => announcement.type === "toast").length > 1) {
            warnings.push("يوجد أكثر من Toast نشط. النظام سيُظهر الأعلى أولوية لتجنب التشويش.");
        }
        if (liveNow.filter((announcement) => announcement.type === "marquee").length > 1) {
            warnings.push("لديك أكثر من شريط متحرك نشط. احتفظ بواحد فقط في الحملات اليومية.");
        }
        if (initial.filter((announcement) => announcement.trigger.type === "always" && announcement.isActive).length > 3) {
            warnings.push("الإعلانات دائمة الظهور كثيرة نسبيًا. هذا قد يضعف التركيز ويؤثر على جودة التجربة.");
        }
        if (liveNow.filter((announcement) => announcement.trigger.type === "on_load" || announcement.trigger.type === "always").length > 3) {
            warnings.push("الحمولة الافتتاحية عالية. خفف الإعلانات التي تظهر مع أول دخول لتقليل التشويش.");
        }
        if (liveNow.filter((announcement) => announcement.type === "banner" || announcement.type === "marquee").length > 2) {
            warnings.push("هناك تزاحم أعلى الصفحة بين الشرائط والبنرات. حافظ على رسالة واحدة أو اثنتين كحد أقصى.");
        }

        const recommendations: string[] = [];
        if (liveNow.length === 0) {
            recommendations.push("شغّل حملة حية واحدة على الأقل حتى تبقى الواجهة العامة مستثمرة.");
        }
        if (upcoming.length === 0) {
            recommendations.push("لا يوجد إطلاق قادم. جهّز حملة مجدولة حتى لا يتوقف الزخم بعد الحملة الحالية.");
        }
        if (routeTargets.length === 0) {
            recommendations.push("لا توجد حملات مرتبطة بصفحات بعينها. استخدم page enter لرسائل checkout أو design أو join.");
        }
        if (liveNow.every((announcement) => announcement.trigger.frequency === "always") && liveNow.length > 0) {
            recommendations.push("الطابور الحي يعتمد بالكامل على always. امزج معه session أو once حتى لا يرهق الزائر.");
        }

        return { liveNow, upcoming, typeMix, triggerMix, routeTargets, warnings, recommendations };
    }, [initial]);

    const filtered = useMemo(() => {
        if (!search.trim()) return initial;
        const q = search.toLowerCase();
        return initial.filter((a) =>
            a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
        );
    }, [initial, search]);

    const templatePreview = templates.find((t) => t.id === form.template);

    return (
        <div className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm shadow-lg backdrop-blur">
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            <section className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6 md:p-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_28%)]" />
                <div className="relative grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                                Announcement Operations Center
                            </span>
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs font-semibold text-theme-soft">
                                حي الآن: {operationsSnapshot.liveNow.length}
                            </span>
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs font-semibold text-theme-soft">
                                قريبًا: {operationsSnapshot.upcoming.length}
                            </span>
                        </div>

                        <div>
                            <h3 className="text-2xl font-black text-theme md:text-3xl">مركز تشغيل العروض والإعلانات</h3>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                صمّم الحملة، راقب تضارب الظهور، وأطلق رسائل أوضح حسب نوع التجربة بدل إدارة الإعلانات كقائمة عناصر فقط.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">قوالب تشغيل سريعة</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {announcementPresets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => applyPreset(preset.id)}
                                        className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-4 text-right transition-colors hover:border-gold/20 hover:bg-[color:var(--surface-elevated)]"
                                    >
                                        <p className="text-sm font-bold text-theme">{preset.label}</p>
                                        <p className="mt-2 text-xs leading-6 text-theme-subtle">{preset.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="rounded-[24px] border border-theme-subtle bg-theme-faint p-4 sm:p-5">
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">الطابور الحي</p>
                            <div className="mt-4 space-y-3">
                                {operationsSnapshot.liveNow.length > 0 ? (
                                    operationsSnapshot.liveNow.slice(0, 4).map((announcement) => (
                                        <div key={announcement.id} className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-bold text-theme">{announcement.title}</p>
                                                <span className="rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[10px] font-bold text-theme-subtle">
                                                    {typeLabels[announcement.type]?.label}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-theme-subtle">
                                                الأولوية #{announcement.priority} · {triggerLabels[announcement.trigger.type]?.label}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                                        لا يوجد إعلان حي الآن.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-theme-subtle bg-theme-faint p-4 sm:p-5">
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">الإطلاق القادم</p>
                            <div className="mt-4 space-y-3">
                                {operationsSnapshot.upcoming.length > 0 ? (
                                    operationsSnapshot.upcoming.slice(0, 3).map((announcement) => (
                                        <div key={announcement.id} className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-bold text-theme">{announcement.title}</p>
                                                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">
                                                    {typeLabels[announcement.type]?.label}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-theme-subtle">
                                                يبدأ {new Date(announcement.startDate || "").toLocaleString("ar-SA", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                                        لا توجد حملة مجدولة بعد الطابور الحالي.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-theme-subtle bg-theme-faint p-4 sm:p-5">
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">خريطة التوزيع</p>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-theme-subtle">المحفزات الحية</p>
                                    <div className="space-y-2">
                                        {(Object.entries(operationsSnapshot.triggerMix) as [TriggerType, number][])
                                            .filter(([, count]) => count > 0)
                                            .map(([triggerType, count]) => (
                                                <div key={triggerType} className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-3 py-2">
                                                    <span className="text-xs text-theme">{triggerLabels[triggerType].label}</span>
                                                    <span className="rounded-full border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] font-bold text-theme-subtle">
                                                        {count}
                                                    </span>
                                                </div>
                                            ))}
                                        {Object.values(operationsSnapshot.triggerMix).every((count) => count === 0) && (
                                            <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-3 py-4 text-center text-xs text-theme-subtle">
                                                لا توجد محفزات نشطة الآن.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-theme-subtle">الصفحات الأكثر استهدافًا</p>
                                    <div className="space-y-2">
                                        {operationsSnapshot.routeTargets.length > 0 ? (
                                            operationsSnapshot.routeTargets.slice(0, 4).map((page) => (
                                                <div key={page.value} className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-3 py-2">
                                                    <span className="text-xs text-theme">{page.label}</span>
                                                    <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
                                                        {page.count}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-3 py-4 text-center text-xs text-theme-subtle">
                                                لا توجد حملات page enter مرتبطة بصفحات محددة.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-theme-subtle bg-theme-faint p-4 sm:p-5">
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">صحة النظام</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                    <p className="text-xs text-theme-faint">Banners</p>
                                    <p className="mt-2 text-lg font-bold text-theme">{operationsSnapshot.typeMix.banner}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                    <p className="text-xs text-theme-faint">Popups</p>
                                    <p className="mt-2 text-lg font-bold text-theme">{operationsSnapshot.typeMix.popup}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                    <p className="text-xs text-theme-faint">Toasts</p>
                                    <p className="mt-2 text-lg font-bold text-theme">{operationsSnapshot.typeMix.toast}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                    <p className="text-xs text-theme-faint">Marquees</p>
                                    <p className="mt-2 text-lg font-bold text-theme">{operationsSnapshot.typeMix.marquee}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {operationsSnapshot.warnings.length > 0 ? (
                                    operationsSnapshot.warnings.map((warning) => (
                                        <div key={warning} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                            {warning}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                        لا يوجد تضارب تشغيلي واضح في الطابور الحالي.
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 space-y-2">
                                {operationsSnapshot.recommendations.map((recommendation) => (
                                    <div key={recommendation} className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-theme-subtle">
                                        {recommendation}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "الإجمالي", value: stats.total, color: "text-theme-soft", bg: "bg-theme-faint border-theme-subtle" },
                    { label: "نشطة حالياً", value: stats.active, color: "text-emerald-400", bg: stats.active > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-theme-faint border-theme-subtle" },
                    { label: "مجدولة", value: stats.scheduled, color: "text-blue-400", bg: stats.scheduled > 0 ? "bg-blue-500/5 border-blue-500/20" : "bg-theme-faint border-theme-subtle" },
                    { label: "منتهية", value: stats.expired, color: "text-theme-faint", bg: "bg-theme-faint border-theme-subtle" },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-2xl border backdrop-blur-sm ${s.bg}`}>
                        <span className="text-[11px] text-theme-subtle font-medium">{s.label}</span>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            <section className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                <div className="theme-surface-panel rounded-[26px] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">Performance Radar</p>
                            <h4 className="mt-2 text-lg font-black text-theme">أداء الإعلانات خلال آخر {engagement.lookbackDays} يومًا</h4>
                        </div>
                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[11px] font-semibold text-theme-subtle">
                            {engagement.totals.trackedAnnouncements} حملات متتبعة
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs text-theme-faint">Views</p>
                            <p className="mt-2 text-2xl font-black text-theme">{engagement.totals.views}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs text-theme-faint">Clicks</p>
                            <p className="mt-2 text-2xl font-black text-theme">{engagement.totals.clicks}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs text-theme-faint">Dismisses</p>
                            <p className="mt-2 text-2xl font-black text-theme">{engagement.totals.dismisses}</p>
                        </div>
                        <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4">
                            <p className="text-xs text-gold/80">CTR</p>
                            <p className="mt-2 text-2xl font-black text-gold">{engagement.totals.ctr}%</p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        {engagement.livePerformance.length > 0 ? (
                            engagement.livePerformance.map((campaign) => (
                                <div key={campaign.id} className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-theme">{campaign.title}</p>
                                        <p className="mt-1 text-xs text-theme-subtle">
                                            {typeLabels[campaign.type]?.label} · {campaign.views} views · {campaign.clicks} clicks · {campaign.dismisses} dismisses
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <span className="block rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[10px] font-bold text-theme-subtle">
                                            CTR {campaign.ctr}%
                                        </span>
                                        <span className="mt-1 block text-[10px] font-semibold text-rose-400">
                                            Dismiss {campaign.dismissRate}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                                لا توجد بيانات أداء كافية بعد. اترك حملة حية ثم راقب الظهور والنقر.
                            </div>
                        )}
                    </div>
                </div>

                <div className="theme-surface-panel rounded-[26px] p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">أفضل الحملات</p>
                            <div className="mt-4 space-y-2">
                                {engagement.topAnnouncements.length > 0 ? (
                                    engagement.topAnnouncements.map((campaign, index) => (
                                        <div key={campaign.id} className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-theme">{index + 1}. {campaign.title}</p>
                                                    <p className="mt-1 text-xs text-theme-subtle">
                                                        {campaign.views} views · {campaign.clicks} clicks · CTR {campaign.ctr}% · Dismiss {campaign.dismissRate}%
                                                    </p>
                                                </div>
                                                <span className="rounded-full border border-theme-subtle bg-[color:var(--surface-elevated)] px-2.5 py-1 text-[10px] font-bold text-theme-subtle">
                                                    {typeLabels[campaign.type]?.label}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                                        لا توجد حملات مقاسة بعد.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">أفضل الصفحات استجابة</p>
                            <div className="mt-4 space-y-2">
                                {engagement.topPaths.length > 0 ? (
                                    engagement.topPaths.map((pathItem) => (
                                        <div key={pathItem.path} className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="truncate text-sm font-bold text-theme" dir="ltr">{pathItem.path}</p>
                                                <div className="text-left">
                                                    <span className="block rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold">
                                                        CTR {pathItem.ctr}%
                                                    </span>
                                                    <span className="mt-1 block text-[10px] font-semibold text-rose-400">
                                                        Dismiss {pathItem.dismissRate}%
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-xs text-theme-subtle">
                                                {pathItem.views} views · {pathItem.clicks} clicks · {pathItem.dismisses} dismisses
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                                        لا توجد بيانات كافية عن الصفحات حتى الآن.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">Friction Queue</p>
                            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300">
                                Dismiss Rate {engagement.totals.dismissRate}%
                            </span>
                        </div>
                        <div className="mt-4 space-y-2">
                            {engagement.frictionQueue.length > 0 ? (
                                engagement.frictionQueue.map((campaign) => (
                                    <div key={campaign.id} className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-theme">{campaign.title}</p>
                                            <p className="mt-1 text-xs text-theme-subtle">
                                                {campaign.views} views · {campaign.dismisses} dismisses · CTR {campaign.ctr}%
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-300">
                                            {campaign.dismissRate}%
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-8 text-center text-sm text-theme-subtle">
                                    لا توجد حملات مزعجة بشكل واضح حتى الآن.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Toolbar ─── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full flex-1 sm:max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث في الإعلانات..."
                        className="input-dark w-full rounded-lg py-2 pr-10 pl-4 text-sm transition-all" />
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-bold text-gold transition-all hover:bg-gold/20">
                    <Plus className="w-4 h-4" /> إعلان جديد
                </button>
            </div>

            {/* ─── Create/Edit Form ─── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="theme-surface-panel overflow-hidden rounded-2xl border-gold/15"
                    >
                        <div className="space-y-5 p-5 sm:p-6">
                            {/* Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="font-bold text-theme-strong flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-gold" />
                                    {editingId ? "تعديل الإعلان" : "إعلان جديد"}
                                </h3>
                                <button onClick={resetForm} className="p-2 rounded-lg text-theme-subtle hover:bg-theme-faint">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Title + Body */}
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">العنوان *</label>
                                    <input type="text" value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder={templatePreview?.headlineHint || "عنوان الإعلان"}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" />
                                    {templatePreview && (
                                        <p className="mt-1.5 text-[11px] leading-5 text-theme-faint">
                                            {templatePreview.kicker} · {templatePreview.headlineHint}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">المحتوى *</label>
                                    <textarea value={form.body}
                                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                                        placeholder={templatePreview?.bodyHint || "نص الإعلان..."}
                                        rows={2}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm resize-none" />
                                    {templatePreview && (
                                        <p className="mt-1.5 text-[11px] leading-6 text-theme-faint">
                                            {templatePreview.bodyHint}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Type + Template */}
                            <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">نوع العرض</label>
                                    <select value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm">
                                        {Object.entries(typeLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">الأولوية</label>
                                    <input type="number" min="0" value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">وضعية القالب</label>
                                    <select
                                        value={form.layoutMode}
                                        onChange={(e) => setForm({ ...form, layoutMode: e.target.value as NonNullable<Announcement["layoutMode"]> })}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                                    >
                                        {Object.entries(layoutModeLabels).map(([key, value]) => (
                                            <option key={key} value={key}>{value.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                {(Object.entries(layoutModeLabels) as Array<[NonNullable<Announcement["layoutMode"]>, { label: string; desc: string }]>).map(([key, value]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm({ ...form, layoutMode: key })}
                                        className={`rounded-2xl border px-4 py-3 text-right transition-colors ${form.layoutMode === key
                                            ? "border-gold/25 bg-gold/10"
                                            : "border-theme-subtle bg-theme-faint hover:border-theme-soft"}`}
                                    >
                                        <p className={`text-sm font-bold ${form.layoutMode === key ? "text-gold" : "text-theme"}`}>{value.label}</p>
                                        <p className="mt-1 text-[11px] leading-6 text-theme-subtle">{value.desc}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Template Selection */}
                            <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-theme-subtle">القالب</label>
                                        <p className="mt-1 text-[11px] leading-6 text-theme-faint">
                                            اختر هوية بصرية كاملة للحملة، لا مجرد لون أو خلفية.
                                        </p>
                                    </div>
                                    {templatePreview && (
                                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[10px] font-bold text-theme-subtle">
                                            {templatePreview.family}
                                        </span>
                                    )}
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {templates.map((t) => (
                                        <button key={t.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, template: t.id })}
                                            className={`rounded-[24px] border p-3 text-right transition-all ${form.template === t.id
                                                ? "border-gold/35 bg-gold/5 shadow-[0_18px_40px_rgba(206,174,127,0.18)]"
                                                : "border-theme-subtle bg-theme-faint hover:border-theme-soft hover:bg-[color:var(--surface-elevated)]"}`}
                                        >
                                            <div className={`overflow-hidden rounded-[20px] p-4 ${t.preview}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className="rounded-full border border-black/10 bg-black/5 p-2 dark:border-white/10 dark:bg-white/10">
                                                        <t.icon className="h-4 w-4" />
                                                    </span>
                                                    <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[10px] font-bold dark:border-white/10 dark:bg-white/10">
                                                        {t.family}
                                                    </span>
                                                </div>
                                                <div className="mt-10 space-y-1 text-right">
                                                    <p className="text-base font-black">{t.label}</p>
                                                    <p className="line-clamp-2 text-[11px] leading-5 opacity-85">{t.description}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 space-y-1 px-1">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-bold text-theme">{t.label}</p>
                                                    {form.template === t.id && (
                                                        <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
                                                            محدد
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] leading-6 text-theme-subtle">{t.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="theme-surface-panel space-y-4 rounded-xl border-gold/15 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-xs font-bold text-gold flex items-center gap-2">
                                            <ImagePlus className="w-4 h-4" /> الوسائط الإعلانية
                                        </h4>
                                        <p className="mt-1 text-[11px] text-theme-subtle">
                                            ارفع صورة أو GIF أو فيديو قصير لإعطاء القالب حضورًا أقوى.
                                        </p>
                                    </div>
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gold/20 bg-gold/10 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/15">
                                        {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : form.mediaType === "video" ? <Clapperboard className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                                        {uploadingMedia ? "جاري الرفع..." : form.mediaUrl ? "استبدال الوسيط" : "رفع وسائط"}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0] || null;
                                                void handleMediaSelected(file);
                                                event.currentTarget.value = "";
                                            }}
                                        />
                                    </label>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-[1fr,0.9fr]">
                                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-3">
                                        {form.mediaUrl ? (
                                            <AnnouncementMediaPreview
                                                url={form.mediaUrl}
                                                mediaType={form.mediaType}
                                                posterUrl={form.mediaPosterUrl || undefined}
                                                title={form.mediaAlt || form.title || "وسيط الإعلان"}
                                                className="aspect-[16/9] w-full rounded-xl object-cover"
                                                controls={form.mediaType === "video"}
                                            />
                                        ) : (
                                            <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-theme-subtle bg-[color:var(--surface-elevated)] text-sm text-theme-subtle">
                                                لا يوجد وسيط مرفوع بعد
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-theme-subtle">وصف الوسيط</label>
                                            <input
                                                type="text"
                                                value={form.mediaAlt}
                                                onChange={(e) => setForm({ ...form, mediaAlt: e.target.value })}
                                                placeholder="مثال: فيديو عرض الشتاء أو صورة الكوبون"
                                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                                            />
                                        </div>

                                        <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3 text-xs text-theme-subtle">
                                            <p className="font-semibold text-theme">الأنواع المدعومة</p>
                                            <p className="mt-1 leading-6">JPG / PNG / WebP / GIF / MP4 / WebM / MOV</p>
                                            <p className="mt-1 leading-6">الحد الأقصى: 25MB</p>
                                        </div>

                                        {form.mediaType === "video" && (
                                            <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold text-theme">صورة غلاف الفيديو</p>
                                                        <p className="mt-1 text-[11px] leading-6 text-theme-subtle">
                                                            تظهر قبل التشغيل وتفيد مع القوالب السينمائية وHero.
                                                        </p>
                                                    </div>
                                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-[11px] font-bold text-gold hover:bg-gold/15">
                                                        {uploadingPoster ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                                                        {uploadingPoster ? "جاري الرفع..." : form.mediaPosterUrl ? "استبدال الغلاف" : "رفع غلاف"}
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                                            className="hidden"
                                                            onChange={(event) => {
                                                                const file = event.target.files?.[0] || null;
                                                                void handlePosterSelected(file);
                                                                event.currentTarget.value = "";
                                                            }}
                                                        />
                                                    </label>
                                                </div>

                                                <div className="mt-3 rounded-2xl border border-theme-subtle bg-theme-faint p-2">
                                                    {form.mediaPosterUrl ? (
                                                        <img
                                                            src={form.mediaPosterUrl}
                                                            alt="صورة غلاف الفيديو"
                                                            className="aspect-[16/9] w-full rounded-xl object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-theme-subtle bg-[color:var(--surface-elevated)] text-xs text-theme-subtle">
                                                            لا توجد صورة غلاف مرفوعة
                                                        </div>
                                                    )}
                                                </div>

                                                {form.mediaPosterUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm({ ...form, mediaPosterUrl: "" })}
                                                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/15"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        إزالة الغلاف
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {form.mediaUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, mediaUrl: "", mediaType: undefined, mediaPosterUrl: "", mediaAlt: "" })}
                                                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/15"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                إزالة الوسيط
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <label className="block text-xs font-medium text-theme-subtle">معاينة حية</label>
                                    {templatePreview && (
                                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[10px] font-bold text-theme-subtle">
                                            {templatePreview.label} · {templatePreview.family}
                                        </span>
                                    )}
                                </div>
                                <AnnouncementLivePreview
                                    form={form}
                                    previewClassName={templatePreview?.preview || "bg-theme-faint border border-theme-subtle text-theme-strong"}
                                />
                                {templatePreview && (
                                    <p className="mt-3 text-xs leading-6 text-theme-subtle">
                                        {templatePreview.description}
                                    </p>
                                )}
                            </div>

                            {/* ═══ TRIGGER SETTINGS ═══ */}
                            <div className="theme-surface-panel space-y-4 rounded-xl border-gold/15 p-4">
                                <h4 className="text-xs font-bold text-gold flex items-center gap-2">
                                    <Target className="w-4 h-4" /> إعدادات الظهور والمحفّزات
                                </h4>

                                {/* Trigger Type */}
                                <div>
                                    <label className="block text-[11px] font-medium text-theme-subtle mb-2">متى يظهر الإعلان؟</label>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                        {(Object.entries(triggerLabels) as [TriggerType, typeof triggerLabels[TriggerType]][]).map(([key, val]) => (
                                            <button key={key}
                                                onClick={() => updateTrigger({ type: key })}
                                                className={`p-2.5 rounded-lg border text-right transition-all ${form.trigger.type === key
                                                    ? "border-gold/30 bg-gold/5"
                                                    : "border-theme-subtle hover:border-theme-soft"}`}
                                            >
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <val.icon className={`w-3.5 h-3.5 ${form.trigger.type === key ? "text-gold" : "text-theme-faint"}`} />
                                                    <span className={`text-[11px] font-bold ${form.trigger.type === key ? "text-gold" : "text-theme-subtle"}`}>{val.label}</span>
                                                </div>
                                                <p className="text-[9px] text-theme-faint leading-tight">{val.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Conditional Fields based on trigger type */}
                                {form.trigger.type === "after_delay" && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-theme-subtle mb-1.5">
                                            <Timer className="w-3 h-3 inline ml-1" /> المدة بالثواني
                                        </label>
                                        <input type="number" min="1" max="300"
                                            value={form.trigger.delaySeconds || 5}
                                            onChange={(e) => updateTrigger({ delaySeconds: parseInt(e.target.value) || 5 })}
                                            className="input-dark w-32 rounded-lg px-3 py-2 text-sm" />
                                        <p className="text-[9px] text-theme-faint mt-1">سيظهر الإعلان بعد {form.trigger.delaySeconds || 5} ثانية من دخول الزائر</p>
                                    </div>
                                )}

                                {form.trigger.type === "page_enter" && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-theme-subtle mb-2">
                                            <MousePointerClick className="w-3 h-3 inline ml-1" /> الصفحات المستهدفة
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {PAGE_OPTIONS.map((p) => {
                                                const selected = form.trigger.targetPages?.includes(p.value) || false;
                                                return (
                                                    <button key={p.value}
                                                        onClick={() => {
                                                            const current = form.trigger.targetPages || [];
                                                            const next = selected
                                                                ? current.filter((v) => v !== p.value)
                                                                : [...current, p.value];
                                                            updateTrigger({ targetPages: next });
                                                        }}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${selected
                                                            ? "border-gold/30 bg-gold/10 text-gold"
                                                            : "border-theme-subtle text-theme-subtle hover:border-theme-soft"}`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {form.trigger.type === "scroll_depth" && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-theme-subtle mb-1.5">
                                            <ArrowDown className="w-3 h-3 inline ml-1" /> نسبة التمرير (%)
                                        </label>
                                        <input type="number" min="10" max="100" step="10"
                                            value={form.trigger.scrollPercent || 50}
                                            onChange={(e) => updateTrigger({ scrollPercent: parseInt(e.target.value) || 50 })}
                                            className="input-dark w-32 rounded-lg px-3 py-2 text-sm" />
                                        <p className="text-[9px] text-theme-faint mt-1">يظهر عند تمرير {form.trigger.scrollPercent || 50}% من الصفحة</p>
                                    </div>
                                )}

                                {/* Frequency + Dismissible */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-[11px] font-medium text-theme-subtle mb-1.5">تكرار الظهور</label>
                                        <select value={form.trigger.frequency}
                                            onChange={(e) => updateTrigger({ frequency: e.target.value as any })}
                                            className="input-dark w-full rounded-lg px-3 py-2 text-sm">
                                            {Object.entries(frequencyLabels).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={form.trigger.dismissible}
                                                onChange={(e) => updateTrigger({ dismissible: e.target.checked })}
                                                className="rounded border-theme-soft" />
                                            <span className="text-xs text-theme-subtle">يمكن إغلاقه</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Link */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">رابط (اختياري)</label>
                                    <input type="url" value={form.link}
                                        onChange={(e) => setForm({ ...form, link: e.target.value })}
                                        placeholder="https://..."
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">نص الرابط</label>
                                    <input type="text" value={form.linkText}
                                        onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                                        placeholder="مثال: تسوق الآن"
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                            </div>

                            {!form.link.trim() && form.trigger.dismissible && (
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5">نص زر الإغلاق</label>
                                    <input
                                        type="text"
                                        value={form.dismissText}
                                        onChange={(e) => setForm({ ...form, dismissText: e.target.value })}
                                        placeholder={getAnnouncementDismissLabel({
                                            title: form.title || "",
                                            body: form.body || "",
                                            type: form.type,
                                            template: form.template,
                                            linkText: "",
                                            dismissText: "",
                                        })}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                                    />
                                    <p className="mt-1.5 text-[11px] leading-6 text-theme-faint">
                                        يَظهر هذا النص بدل الزر العام عندما لا يوجد رابط للحملة. اتركه فارغًا ليختار النظام نصًا مناسبًا تلقائيًا.
                                    </p>
                                </div>
                            )}

                            {/* Scheduling */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> بداية العرض
                                    </label>
                                    <input type="datetime-local" value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-theme-subtle mb-1.5 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> نهاية العرض
                                    </label>
                                    <input type="datetime-local" value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 text-sm" dir="ltr" />
                                </div>
                            </div>

                            {/* Active + Submit */}
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="rounded border-theme-soft" />
                                    <span className="text-sm text-theme-soft">نشط فوراً</span>
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <button onClick={resetForm}
                                        className="min-h-[42px] px-4 py-2 text-sm text-theme-subtle hover:text-theme-soft transition-colors">
                                        إلغاء
                                    </button>
                                    <button onClick={handleSubmit} disabled={loading}
                                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gold/20 px-6 py-2.5 text-sm font-bold text-gold transition-all hover:bg-gold/30 disabled:opacity-50">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {editingId ? "حفظ التعديلات" : "إنشاء الإعلان"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Announcements List ─── */}
            <div className="theme-surface-panel overflow-hidden rounded-2xl">
                {filtered.length === 0 ? (
                    <div className="p-16 text-center text-theme-faint">
                        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">لا توجد إعلانات</p>
                        <button onClick={() => { resetForm(); setShowForm(true); }}
                            className="mt-3 text-gold hover:text-gold-light text-sm font-medium">
                            إنشاء أول إعلان
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-theme-faint">
                        {filtered.map((a, i) => {
                            const tmpl = templates.find((t) => t.id === a.template);
                            const typeInfo = typeLabels[a.type];
                            const triggerInfo = a.trigger ? triggerLabels[a.trigger.type] : null;
                            const now = new Date();
                            const isScheduled = a.startDate && new Date(a.startDate) > now;
                            const isExpired = a.endDate && new Date(a.endDate) < now;
                            const isLive = a.isActive && !isScheduled && !isExpired;

                            return (
                                <motion.div key={a.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                    className={`px-5 py-4 hover:bg-theme-faint transition-all ${!a.isActive ? "opacity-50" : ""}`}
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        {/* Template Preview Mini */}
                                        {a.mediaUrl ? (
                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-theme-subtle bg-[color:var(--surface-elevated)]">
                                                <AnnouncementMediaPreview
                                                    url={a.mediaUrl}
                                                    mediaType={a.mediaType}
                                                    posterUrl={a.mediaPosterUrl}
                                                    title={a.mediaAlt || a.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${tmpl?.preview || "bg-theme-faint"}`}>
                                                {tmpl?.icon && <tmpl.icon className="w-5 h-5" />}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="text-sm font-bold text-theme-strong truncate">{a.title}</h4>
                                                {isLive && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> نشط
                                                    </span>
                                                )}
                                                {isScheduled && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">مجدول</span>
                                                )}
                                                {isExpired && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-theme-faint text-theme-faint font-bold">منتهي</span>
                                                )}
                                                {!a.isActive && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-theme-faint text-theme-faint font-bold">معطّل</span>
                                                )}
                                                {a.mediaUrl && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 text-gold font-bold">
                                                        {a.mediaType === "video" ? "فيديو" : "وسائط"}
                                                    </span>
                                                )}
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-theme-faint text-theme-subtle font-bold">
                                                    {tmpl?.label || a.template}
                                                </span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-theme-faint text-theme-subtle font-bold">
                                                    {layoutModeLabels[a.layoutMode || "classic"].label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-theme-faint truncate">{a.body}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-theme-faint flex-wrap">
                                                <span className="flex items-center gap-0.5">
                                                    {typeInfo?.icon && <typeInfo.icon className="w-2.5 h-2.5" />} {typeInfo?.label}
                                                </span>
                                                {triggerInfo && (
                                                    <span className="flex items-center gap-0.5 text-gold/50">
                                                        <triggerInfo.icon className="w-2.5 h-2.5" /> {triggerInfo.label}
                                                    </span>
                                                )}
                                                {a.trigger?.frequency && (
                                                    <span className="text-theme-faint">· {frequencyLabels[a.trigger.frequency]}</span>
                                                )}
                                                {a.startDate && <span>من: {new Date(a.startDate).toLocaleDateString("ar-SA")}</span>}
                                                {a.endDate && <span>إلى: {new Date(a.endDate).toLocaleDateString("ar-SA")}</span>}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center gap-1 shrink-0 sm:justify-end">
                                            <button onClick={() => handleToggle(a.id)}
                                                className={`p-2 rounded-lg transition-all ${a.isActive ? "text-emerald-400 hover:bg-emerald-500/10" : "text-theme-faint hover:bg-theme-faint"}`}
                                                title={a.isActive ? "إيقاف" : "تفعيل"}>
                                                {a.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => startEdit(a)}
                                                className="p-2 rounded-lg text-theme-subtle hover:text-gold hover:bg-gold/10 transition-all" title="تعديل">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            {confirmDeleteId === a.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleDelete(a.id)}
                                                        className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                                        تأكيد
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2 py-1 rounded text-[10px] text-theme-subtle hover:bg-theme-faint">
                                                        إلغاء
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteId(a.id)}
                                                    className="p-2 rounded-lg text-theme-subtle hover:text-red-400 hover:bg-red-500/10 transition-all" title="حذف">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
