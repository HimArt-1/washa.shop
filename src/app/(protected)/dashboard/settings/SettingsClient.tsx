"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Eye, EyeOff, Globe, Truck, Save, Loader2, Tag, QrCode,
    Instagram, Twitter, Mail, Phone, Sparkles, Image as ImageIcon, ShieldAlert, History, Activity, RotateCcw, type LucideIcon,
} from "lucide-react";
import {
    updateSiteSetting,
    uploadExclusiveDesignImage,
    type OperationalRuleSignal,
    type OperationalRulesDiagnostics,
    type SiteSettingsType,
} from "@/app/actions/settings";

interface SettingsProps {
    settings: SiteSettingsType;
    diagnostics: OperationalRulesDiagnostics;
}

type VisibilityState = {
    gallery: boolean;
    store: boolean;
    signup: boolean;
    join: boolean;
    join_artist: boolean;
    ai_section: boolean;
    hero_auth_buttons: boolean;
    hero_washa_ai_button: boolean;
    hero_join_artist_button: boolean;
    design_piece: boolean;
    design_piece_ai_switch: boolean;
    design_piece_dtf_studio_switch: boolean;
    design_piece_generation_public: boolean;
};

// ─── Toggle Switch ──────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-theme-faint border border-theme-subtle hover:border-theme-soft transition-all group"
        >
            <div className="flex items-center gap-3">
                {checked ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-theme-faint" />}
                <span className="text-sm font-medium text-theme-soft">{label}</span>
            </div>
            <div
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${checked ? "bg-green-500/80" : "bg-white/10"
                    }`}
            >
                <motion.div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: checked ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </div>
        </button>
    );
}

// ─── Section Card ───────────────────────────────────────

function SettingsCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-theme-subtle flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gold/10">
                    <Icon className="w-4 h-4 text-gold" />
                </div>
                <h3 className="font-bold text-theme text-sm">{title}</h3>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ─── Input Field ────────────────────────────────────────

function Field({
    label, value, onChange, placeholder, icon: Icon, type = "text", dir,
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; icon?: LucideIcon; type?: string; dir?: string;
}) {
    return (
        <div className="space-y-2">
            <label className="text-xs text-theme-subtle font-medium">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    dir={dir}
                    className="w-full px-4 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors placeholder:text-theme-faint"
                />
                {Icon && <Icon className="absolute left-3 top-2.5 w-4 h-4 text-theme-faint pointer-events-none" />}
            </div>
        </div>
    );
}

function SignalStateBadge({ state }: { state: OperationalRuleSignal["state"] }) {
    const map = {
        healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
        warning: "bg-amber-500/15 text-amber-300 border-amber-500/20",
        critical: "bg-rose-500/15 text-rose-300 border-rose-500/20",
        disabled: "bg-white/5 text-theme-subtle border-white/10",
    } as const;

    const label = {
        healthy: "سليم",
        warning: "تحذير",
        critical: "حرج",
        disabled: "معطل",
    } as const;

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${map[state]}`}>
            {label[state]}
        </span>
    );
}

function formatRuleMetric(value: number) {
    return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function buildRuleSections(
    metrics: OperationalRulesDiagnostics["metrics"],
    rules: SiteSettingsType["operational_rules"]
) {
    const inventoryRestockTriggered =
        (rules.inventory.restockPressureItemsMin > 0 && metrics.inventory.highPressureRestocks >= rules.inventory.restockPressureItemsMin) ||
        (rules.inventory.lowStockTotalMin > 0 && metrics.inventory.lowStockTotal >= rules.inventory.lowStockTotalMin);

    const failedPaymentsWarningTriggered =
        (rules.payments.failedPaymentsWarningMin > 0 && metrics.payments.failedPayments >= rules.payments.failedPaymentsWarningMin) ||
        (rules.payments.atRiskRevenueWarning > 0 && metrics.payments.atRiskRevenue >= rules.payments.atRiskRevenueWarning);
    const failedPaymentsCriticalTriggered =
        (rules.payments.failedPaymentsCriticalMin > 0 && metrics.payments.failedPayments >= rules.payments.failedPaymentsCriticalMin) ||
        (rules.payments.atRiskRevenueCritical > 0 && metrics.payments.atRiskRevenue >= rules.payments.atRiskRevenueCritical);

    const pendingPaymentsWarningTriggered =
        (rules.payments.pendingPaymentsWarningMin > 0 && metrics.payments.pendingPayments >= rules.payments.pendingPaymentsWarningMin) ||
        (rules.payments.outstandingRevenueWarning > 0 && metrics.payments.outstandingRevenue >= rules.payments.outstandingRevenueWarning);
    const pendingPaymentsCriticalTriggered =
        (rules.payments.pendingPaymentsCriticalMin > 0 && metrics.payments.pendingPayments >= rules.payments.pendingPaymentsCriticalMin) ||
        (rules.payments.outstandingRevenueCritical > 0 && metrics.payments.outstandingRevenue >= rules.payments.outstandingRevenueCritical);

    const ordersWarningTriggered =
        (rules.orders.pendingReviewWarningMin > 0 && metrics.orders.pendingReview >= rules.orders.pendingReviewWarningMin) ||
        (rules.orders.fulfillmentQueueWarningMin > 0 && metrics.orders.fulfillmentQueue >= rules.orders.fulfillmentQueueWarningMin) ||
        (rules.orders.paymentPendingWarningMin > 0 && metrics.orders.paymentPending >= rules.orders.paymentPendingWarningMin);
    const ordersCriticalTriggered =
        (rules.orders.pendingReviewCriticalMin > 0 && metrics.orders.pendingReview >= rules.orders.pendingReviewCriticalMin) ||
        (rules.orders.fulfillmentQueueCriticalMin > 0 && metrics.orders.fulfillmentQueue >= rules.orders.fulfillmentQueueCriticalMin) ||
        (rules.orders.paymentPendingCriticalMin > 0 && metrics.orders.paymentPending >= rules.orders.paymentPendingCriticalMin);

    return {
        support: [
            {
                id: "support.slaAtRiskMin",
                title: "التذاكر القريبة من تجاوز SLA",
                description: "يعرض التذاكر التي دخلت منطقة الخطر قبل التحول إلى تعثر فعلي.",
                currentLabel: `${formatRuleMetric(metrics.support.slaAtRisk)} تذكرة`,
                thresholdLabel: rules.support.slaAtRiskMin > 0 ? `يتحرك عند ${formatRuleMetric(rules.support.slaAtRiskMin)}+` : "معطل",
                state:
                    rules.support.slaAtRiskMin === 0
                        ? "disabled"
                        : metrics.support.slaAtRisk >= rules.support.slaAtRiskMin
                          ? "warning"
                          : "healthy",
            },
            {
                id: "support.slaBreachedMin",
                title: "التذاكر المتجاوزة لـ SLA",
                description: "يعرض الحالات التي تجاوزت نافذة الخدمة بالفعل وتحتاج تصعيدًا فوريًا.",
                currentLabel: `${formatRuleMetric(metrics.support.slaBreached)} تذكرة`,
                thresholdLabel: rules.support.slaBreachedMin > 0 ? `يتحرك عند ${formatRuleMetric(rules.support.slaBreachedMin)}+` : "معطل",
                state:
                    rules.support.slaBreachedMin === 0
                        ? "disabled"
                        : metrics.support.slaBreached >= rules.support.slaBreachedMin
                          ? "critical"
                          : "healthy",
            },
        ],
        inventory: [
            {
                id: "inventory.criticalStockoutsMin",
                title: "نفاد المخزون الحرج",
                description: "عناصر نافدة لديها سحب فعلي من المبيعات وقد تؤثر على التنفيذ.",
                currentLabel: `${formatRuleMetric(metrics.inventory.criticalStockouts)} عنصر`,
                thresholdLabel: rules.inventory.criticalStockoutsMin > 0 ? `يتحرك عند ${formatRuleMetric(rules.inventory.criticalStockoutsMin)}+` : "معطل",
                state:
                    rules.inventory.criticalStockoutsMin === 0
                        ? "disabled"
                        : metrics.inventory.criticalStockouts >= rules.inventory.criticalStockoutsMin
                          ? (rules.inventory.fulfillmentQueueCriticalMin > 0 && metrics.inventory.fulfillmentQueue >= rules.inventory.fulfillmentQueueCriticalMin ? "critical" : "warning")
                          : "healthy",
            },
            {
                id: "inventory.restockPressureItemsMin",
                title: "ضغط إعادة التعبئة",
                description: "ينظر إلى العناصر عالية الضغط وإجمالي منخفض المخزون معًا.",
                currentLabel: `${formatRuleMetric(metrics.inventory.highPressureRestocks)} عالي الضغط / ${formatRuleMetric(metrics.inventory.lowStockTotal)} منخفض`,
                thresholdLabel:
                    rules.inventory.restockPressureItemsMin > 0 || rules.inventory.lowStockTotalMin > 0
                        ? `عناصر ${formatRuleMetric(rules.inventory.restockPressureItemsMin)}+ أو منخفض ${formatRuleMetric(rules.inventory.lowStockTotalMin)}+`
                        : "معطل",
                state:
                    rules.inventory.restockPressureItemsMin === 0 && rules.inventory.lowStockTotalMin === 0
                        ? "disabled"
                        : inventoryRestockTriggered
                          ? "warning"
                          : "healthy",
            },
        ],
        payments: [
            {
                id: "payments.failedPaymentsWarningMin",
                title: "المدفوعات المتعثرة",
                description: "يراقب عدد المدفوعات المتعثرة والإيراد المعرض للخطر في نفس الإشارة.",
                currentLabel: `${formatRuleMetric(metrics.payments.failedPayments)} متعثرة / ${formatRuleMetric(metrics.payments.atRiskRevenue)} ر.س معرض`,
                thresholdLabel:
                    rules.payments.failedPaymentsWarningMin > 0 || rules.payments.atRiskRevenueWarning > 0
                        ? `تحذير: ${formatRuleMetric(rules.payments.failedPaymentsWarningMin)} أو ${formatRuleMetric(rules.payments.atRiskRevenueWarning)} ر.س`
                        : "معطل",
                state:
                    rules.payments.failedPaymentsWarningMin === 0 && rules.payments.atRiskRevenueWarning === 0
                        ? "disabled"
                        : failedPaymentsCriticalTriggered
                          ? "critical"
                          : failedPaymentsWarningTriggered
                            ? "warning"
                            : "healthy",
            },
            {
                id: "payments.pendingPaymentsWarningMin",
                title: "طابور التحصيل المعلق",
                description: "يعرض عدد الطلبات بانتظار الدفع والإيراد المعلّق الذي يحتاج متابعة.",
                currentLabel: `${formatRuleMetric(metrics.payments.pendingPayments)} طلب / ${formatRuleMetric(metrics.payments.outstandingRevenue)} ر.س معلق`,
                thresholdLabel:
                    rules.payments.pendingPaymentsWarningMin > 0 || rules.payments.outstandingRevenueWarning > 0
                        ? `تحذير: ${formatRuleMetric(rules.payments.pendingPaymentsWarningMin)} أو ${formatRuleMetric(rules.payments.outstandingRevenueWarning)} ر.س`
                        : "معطل",
                state:
                    rules.payments.pendingPaymentsWarningMin === 0 && rules.payments.outstandingRevenueWarning === 0
                        ? "disabled"
                        : pendingPaymentsCriticalTriggered
                          ? "critical"
                          : pendingPaymentsWarningTriggered
                            ? "warning"
                            : "healthy",
            },
        ],
        orders: [
            {
                id: "orders.backlog",
                title: "ضغط طابور الطلبات",
                description: "مؤشر مركب يراقب المراجعات، التنفيذ، والطلبات بانتظار الدفع.",
                currentLabel: `قرار ${formatRuleMetric(metrics.orders.pendingReview)} / تنفيذ ${formatRuleMetric(metrics.orders.fulfillmentQueue)} / دفع ${formatRuleMetric(metrics.orders.paymentPending)}`,
                thresholdLabel:
                    `تحذير: ${formatRuleMetric(rules.orders.pendingReviewWarningMin)}/${formatRuleMetric(rules.orders.fulfillmentQueueWarningMin)}/${formatRuleMetric(rules.orders.paymentPendingWarningMin)}`,
                state:
                    rules.orders.pendingReviewWarningMin === 0 &&
                    rules.orders.fulfillmentQueueWarningMin === 0 &&
                    rules.orders.paymentPendingWarningMin === 0
                        ? "disabled"
                        : ordersCriticalTriggered
                          ? "critical"
                          : ordersWarningTriggered
                            ? "warning"
                            : "healthy",
            },
        ],
    } as const;
}

// ═══════════════════════════════════════════════════════════

export function SettingsClient({ settings, diagnostics }: SettingsProps) {
    const [visibility, setVisibility] = useState<VisibilityState>({
        gallery: settings.visibility.gallery ?? false,
        store: settings.visibility.store ?? false,
        signup: settings.visibility.signup ?? false,
        join: settings.visibility.join ?? true,
        join_artist: settings.visibility.join_artist ?? true,
        ai_section: settings.visibility.ai_section ?? true,
        hero_auth_buttons: settings.visibility.hero_auth_buttons ?? true,
        hero_washa_ai_button: settings.visibility.hero_washa_ai_button ?? true,
        hero_join_artist_button: settings.visibility.hero_join_artist_button ?? false,
        design_piece: settings.visibility.design_piece ?? true,
        design_piece_ai_switch: settings.visibility.design_piece_ai_switch ?? true,
        design_piece_dtf_studio_switch: settings.visibility.design_piece_dtf_studio_switch ?? true,
        design_piece_generation_public: settings.visibility.design_piece_generation_public ?? false,
    });
    const [washaAi, setWashaAi] = useState({
        dtf_daily_quota_limit: settings.washa_ai?.dtf_daily_quota_limit ?? 5,
    });
    const [siteInfo, setSiteInfo] = useState(settings.site_info);
    const [shipping, setShipping] = useState(settings.shipping);
    const [creationPrices, setCreationPrices] = useState({
        tshirt: settings.creation_prices?.tshirt ?? 89,
        hoodie: settings.creation_prices?.hoodie ?? 149,
        pullover: settings.creation_prices?.pullover ?? 129,
    });
    const [productIdentifiers, setProductIdentifiers] = useState({
        prefix: settings.product_identifiers?.prefix ?? "WSH",
        product_code_template: settings.product_identifiers?.product_code_template ?? "{PREFIX}-{SEQ:5}",
        sku_template: settings.product_identifiers?.sku_template ?? "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}",
    });

    const [aiSimulation, setAiSimulation] = useState({
        step1_image: settings.ai_simulation?.step1_image ?? "/images/design/heavy-tshirt-black-front.svg",
        step1_color_name: settings.ai_simulation?.step1_color_name ?? "أسود كلاسيك",
        step1_pattern: settings.ai_simulation?.step1_pattern ?? "بدون نمط",
        step2_prompt: settings.ai_simulation?.step2_prompt ?? "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...",
        step2_art_style: settings.ai_simulation?.step2_art_style ?? "رسم رقمي (Digital Art)",
        step2_result_image: settings.ai_simulation?.step2_result_image ?? "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80",
        step3_final_image: settings.ai_simulation?.step3_final_image ?? "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80",
    });

    const [brandAssets, setBrandAssets] = useState({
        business_card_name: settings.brand_assets?.business_card_name ?? "هشام الزهراني",
        business_card_title: settings.brand_assets?.business_card_title ?? "المدير التنفيذي",
        business_card_phone: settings.brand_assets?.business_card_phone ?? "+966 53 223 5005",
        business_card_email: settings.brand_assets?.business_card_email ?? "washaksa@hotmail.com",
        business_card_website: settings.brand_assets?.business_card_website ?? "www.washa.shop",
        thank_you_title: settings.brand_assets?.thank_you_title ?? "شكراً لثقتكم",
        thank_you_message: settings.brand_assets?.thank_you_message ?? "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
        thank_you_handle: settings.brand_assets?.thank_you_handle ?? "@washha.sa",
        social_instagram: settings.brand_assets?.social_instagram ?? "@wusha.art",
        social_twitter: settings.brand_assets?.social_twitter ?? "@wusha_art",
        social_tiktok: settings.brand_assets?.social_tiktok ?? "@wusha.art",
        social_snapchat: settings.brand_assets?.social_snapchat ?? "@wusha.art",
        social_whatsapp: settings.brand_assets?.social_whatsapp ?? "+966532235005",
        linktree_title: settings.brand_assets?.linktree_title ?? "وشّى منصة الفن",
        linktree_subtitle: settings.brand_assets?.linktree_subtitle ?? "الإبداع بين يديك",
        show_instagram: settings.brand_assets?.show_instagram ?? true,
        show_twitter: settings.brand_assets?.show_twitter ?? true,
        show_tiktok: settings.brand_assets?.show_tiktok ?? true,
        show_snapchat: settings.brand_assets?.show_snapchat ?? true,
        show_whatsapp: settings.brand_assets?.show_whatsapp ?? true,
        show_website: settings.brand_assets?.show_website ?? true,
    });
    const [operationalRules, setOperationalRules] = useState(settings.operational_rules);

    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async (key: string, value: Record<string, any>) => {
        setSaving(key);
        try {
            const result = await updateSiteSetting(key, value);
            if (result.success) {
                showToast("تم الحفظ بنجاح ✓");
            } else {
                showToast("خطأ: " + (result.error || "حدث خطأ"));
            }
        } catch (error) {
            showToast("خطأ: " + (error instanceof Error ? error.message : "حدث خطأ"));
        } finally {
            setSaving(null);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: "step1_image" | "step2_result_image" | "step3_final_image") => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(`uploading_${fieldKey}`);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Using the same helper used for exclusive designs for general image uploads
            const res = await uploadExclusiveDesignImage(formData);
            if (res.success) {
                const updatedSimulation = { ...aiSimulation, [fieldKey]: res.url };
                setAiSimulation(updatedSimulation);
                // Auto-save to database immediately
                const saveResult = await updateSiteSetting("ai_simulation", updatedSimulation);
                if (saveResult.success) {
                    showToast("تم رفع الصورة وحفظها بنجاح ✓");
                } else {
                    showToast("تم الرفع لكن فشل الحفظ: " + saveResult.error);
                }
            } else {
                showToast("فشل الرفع: " + res.error);
            }
        } catch (error) {
            showToast("فشل الرفع");
        } finally {
            setSaving(null);
            e.target.value = "";
        }
    };

    const updateOperationalRule = (section: keyof typeof operationalRules, key: string, nextValue: string) => {
        const numericValue = Math.max(0, Number(nextValue) || 0);
        setOperationalRules((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: numericValue,
            },
        }));
    };

    const ruleSections = [
        { key: "support", title: "الدعم", signals: diagnostics.sections.support },
        { key: "inventory", title: "المخزون", signals: diagnostics.sections.inventory },
        { key: "payments", title: "المدفوعات", signals: diagnostics.sections.payments },
        { key: "orders", title: "الطلبات", signals: diagnostics.sections.orders },
    ] as const;
    const draftRuleSections = buildRuleSections(diagnostics.metrics, operationalRules);
    const draftRuleGroups = [
        { key: "support", title: "الدعم", signals: draftRuleSections.support },
        { key: "inventory", title: "المخزون", signals: draftRuleSections.inventory },
        { key: "payments", title: "المدفوعات", signals: draftRuleSections.payments },
        { key: "orders", title: "الطلبات", signals: draftRuleSections.orders },
    ] as const;
    const isOperationalRulesDirty = JSON.stringify(operationalRules) !== JSON.stringify(settings.operational_rules);
    const ruleChanges = draftRuleGroups.flatMap((group) =>
        group.signals
            .map((signal) => {
                const currentSignal = diagnostics.sections[group.key].find((item) => item.id === signal.id);
                if (!currentSignal) return null;
                if (currentSignal.state === signal.state && currentSignal.thresholdLabel === signal.thresholdLabel) {
                    return null;
                }
                return {
                    groupTitle: group.title,
                    currentSignal,
                    draftSignal: signal,
                };
            })
            .filter(Boolean) as Array<{
                groupTitle: string;
                currentSignal: OperationalRuleSignal;
                draftSignal: OperationalRuleSignal;
            }>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-gold text-bg font-bold text-sm shadow-lg"
                >
                    {toast}
                </motion.div>
            )}

            {/* ─── 1. Visibility Toggles ─── */}
            <SettingsCard title="إظهار/إخفاء أقسام الموقع" icon={Eye}>
                <div className="space-y-3">
                    <Toggle
                        label="المعرض (Gallery)"
                        checked={visibility.gallery}
                        onChange={(v) => setVisibility({ ...visibility, gallery: v })}
                    />
                    <Toggle
                        label="المتجر (Store)"
                        checked={visibility.store}
                        onChange={(v) => setVisibility({ ...visibility, store: v })}
                    />
                    <Toggle
                        label="تسجيل حساب جديد (Sign Up)"
                        checked={visibility.signup}
                        onChange={(v) => setVisibility({ ...visibility, signup: v })}
                    />
                    <Toggle
                        label="انضم إلينا (Join Section)"
                        checked={visibility.join}
                        onChange={(v) => setVisibility({ ...visibility, join: v })}
                    />
                    <Toggle
                        label="زر «انضم كفنان» في حساب المشترك"
                        checked={visibility.join_artist ?? true}
                        onChange={(v) => setVisibility({ ...visibility, join_artist: v })}
                    />
                    <Toggle
                        label="قسم الذكاء الاصطناعي (AI)"
                        checked={visibility.ai_section}
                        onChange={(v) => setVisibility({ ...visibility, ai_section: v })}
                    />
                    <Toggle
                        label="أزرار تسجيل الدخول/اشتراك في الهيرو"
                        checked={visibility.hero_auth_buttons ?? true}
                        onChange={(v) => setVisibility({ ...visibility, hero_auth_buttons: v })}
                    />
                    <Toggle
                        label="زر WASHA AI في هيرو الصفحة الرئيسية"
                        checked={visibility.hero_washa_ai_button ?? true}
                        onChange={(v) => setVisibility({ ...visibility, hero_washa_ai_button: v })}
                    />
                    <Toggle
                        label="زر «انضم كفنان» في الهيرو"
                        checked={visibility.hero_join_artist_button ?? false}
                        onChange={(v) => setVisibility({ ...visibility, hero_join_artist_button: v })}
                    />
                    <Toggle
                        label="صمم قطعتك (Design Your Piece)"
                        checked={visibility.design_piece ?? true}
                        onChange={(v) => setVisibility({ ...visibility, design_piece: v })}
                    />
                    <Toggle
                        label="اختصار WASHA STUDIO داخل صمم قطعتك"
                        checked={visibility.design_piece_ai_switch ?? true}
                        onChange={(v) => setVisibility({ ...visibility, design_piece_ai_switch: v })}
                    />
                    <Toggle
                        label="اختصار WASHA AI داخل صمم قطعتك"
                        checked={visibility.design_piece_dtf_studio_switch ?? true}
                        onChange={(v) => setVisibility({ ...visibility, design_piece_dtf_studio_switch: v })}
                    />
                    <Toggle
                        label="فتح التوليد للعامة والضيوف"
                        checked={visibility.design_piece_generation_public ?? false}
                        onChange={(v) => setVisibility({ ...visibility, design_piece_generation_public: v })}
                    />
                </div>
                <button
                    onClick={() => handleSave("visibility", visibility)}
                    disabled={saving === "visibility"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "visibility" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات الأقسام
                </button>
            </SettingsCard>

            <SettingsCard title="Washa AI — حدود التوليد" icon={Sparkles}>
                <p className="text-theme-subtle text-sm mb-4">
                    الحد اليومي لتوليد WASHA AI داخل DTF لكل مستخدم مشترك. لا ينطبق على أدوار الإدارة والتطوير.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                        label="الحد اليومي للتوليد"
                        value={String(washaAi.dtf_daily_quota_limit)}
                        onChange={(v) => setWashaAi({
                            ...washaAi,
                            dtf_daily_quota_limit: Math.max(1, Number(v) || 1),
                        })}
                        type="number"
                        dir="ltr"
                    />
                </div>
                <button
                    onClick={() => handleSave("washa_ai", washaAi)}
                    disabled={saving === "washa_ai"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "washa_ai" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات Washa AI
                </button>
            </SettingsCard>

            {/* ─── 2. Site Info ─── */}
            <SettingsCard title="معلومات الموقع" icon={Globe}>
                <p className="text-theme-subtle text-xs mb-4">لإشعارات البريد (طلبات جديدة، طلبات انضمام): أضف <code className="bg-theme-subtle px-1 rounded">ADMIN_EMAIL</code> في ملف .env</p>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                            label="اسم الموقع"
                            value={siteInfo.name}
                            onChange={(v) => setSiteInfo({ ...siteInfo, name: v })}
                            placeholder="وشّى"
                        />
                        <Field
                            label="البريد الإلكتروني (للاستقبال + إشعارات الأدمن)"
                            value={siteInfo.email}
                            onChange={(v) => setSiteInfo({ ...siteInfo, email: v })}
                            placeholder="info@wusha.art"
                            icon={Mail}
                            type="email"
                            dir="ltr"
                        />
                    </div>
                    <Field
                        label="وصف الموقع"
                        value={siteInfo.description}
                        onChange={(v) => setSiteInfo({ ...siteInfo, description: v })}
                        placeholder="منصة الفن العربي الأصيل"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                            label="رقم الهاتف"
                            value={siteInfo.phone}
                            onChange={(v) => setSiteInfo({ ...siteInfo, phone: v })}
                            placeholder="+966..."
                            icon={Phone}
                            dir="ltr"
                        />
                        <Field
                            label="Instagram"
                            value={siteInfo.instagram}
                            onChange={(v) => setSiteInfo({ ...siteInfo, instagram: v })}
                            placeholder="@wusha.art"
                            icon={Instagram}
                            dir="ltr"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                            label="Twitter / X"
                            value={siteInfo.twitter}
                            onChange={(v) => setSiteInfo({ ...siteInfo, twitter: v })}
                            placeholder="@wusha_art"
                            icon={Twitter}
                            dir="ltr"
                        />
                        <Field
                            label="TikTok"
                            value={siteInfo.tiktok}
                            onChange={(v) => setSiteInfo({ ...siteInfo, tiktok: v })}
                            placeholder="@wusha.art"
                            dir="ltr"
                        />
                    </div>
                </div>
                <button
                    onClick={() => handleSave("site_info", siteInfo)}
                    disabled={saving === "site_info"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "site_info" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ معلومات الموقع
                </button>
            </SettingsCard>

            {/* ─── 3. Shipping & Tax ─── */}
            <SettingsCard title="الشحن والضريبة" icon={Truck}>
                <div className="space-y-5">
                    {/* Enable/Disable Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setShipping({ ...shipping, shipping_enabled: !(shipping.shipping_enabled ?? true) })}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                (shipping.shipping_enabled ?? true)
                                    ? "border-green-500/40 bg-green-500/10"
                                    : "border-theme-subtle bg-theme-faint"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Truck className={`w-4 h-4 ${(shipping.shipping_enabled ?? true) ? "text-green-400" : "text-theme-faint"}`} />
                                <span className="text-sm font-medium">الشحن مفعّل</span>
                            </div>
                            <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${(shipping.shipping_enabled ?? true) ? "bg-green-500/80" : "bg-white/10"}`}>
                                <motion.div
                                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                                    animate={{ left: (shipping.shipping_enabled ?? true) ? 22 : 2 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShipping({ ...shipping, tax_enabled: !(shipping.tax_enabled ?? true) })}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                (shipping.tax_enabled ?? true)
                                    ? "border-green-500/40 bg-green-500/10"
                                    : "border-theme-subtle bg-theme-faint"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Tag className={`w-4 h-4 ${(shipping.tax_enabled ?? true) ? "text-green-400" : "text-theme-faint"}`} />
                                <span className="text-sm font-medium">الضريبة مفعّلة</span>
                            </div>
                            <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${(shipping.tax_enabled ?? true) ? "bg-green-500/80" : "bg-white/10"}`}>
                                <motion.div
                                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                                    animate={{ left: (shipping.tax_enabled ?? true) ? 22 : 2 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </button>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className={`transition-opacity ${(shipping.shipping_enabled ?? true) ? "opacity-100" : "opacity-40"}`}>
                            <Field
                                label="تكلفة الشحن الثابتة (ر.س)"
                                value={String(shipping.flat_rate ?? 30)}
                                onChange={(v) => setShipping({ ...shipping, flat_rate: Number(v) || 0 })}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                        <div className={`transition-opacity ${(shipping.shipping_enabled ?? true) ? "opacity-100" : "opacity-40"}`}>
                            <Field
                                label="شحن مجاني فوق (ر.س)"
                                value={String(shipping.free_above ?? 500)}
                                onChange={(v) => setShipping({ ...shipping, free_above: Number(v) || 0 })}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                        <div className={`transition-opacity ${(shipping.tax_enabled ?? true) ? "opacity-100" : "opacity-40"}`}>
                            <Field
                                label="نسبة الضريبة (%)"
                                value={String(shipping.tax_rate ?? 15)}
                                onChange={(v) => setShipping({ ...shipping, tax_rate: Number(v) || 0 })}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="rounded-xl bg-theme-faint border border-theme-subtle p-4 text-sm space-y-2">
                        <p className="text-xs text-theme-faint font-bold mb-2">معاينة فورية لفاتورة 300 ر.س:</p>
                        <div className="flex justify-between text-theme-soft">
                            <span>المجموع الفرعي</span>
                            <span>300.00 ر.س</span>
                        </div>
                        <div className="flex justify-between text-theme-soft">
                            <span>الشحن</span>
                            <span>
                                {!(shipping.shipping_enabled ?? true)
                                    ? <span className="text-theme-faint line-through">معطّل</span>
                                    : 300 >= (shipping.free_above ?? 500)
                                        ? "مجاني 🎉"
                                        : `${shipping.flat_rate ?? 30} ر.س`}
                            </span>
                        </div>
                        <div className="flex justify-between text-theme-soft">
                            <span>الضريبة ({shipping.tax_rate ?? 15}%)</span>
                            <span>
                                {!(shipping.tax_enabled ?? true)
                                    ? <span className="text-theme-faint">معطّلة</span>
                                    : `${(300 * ((shipping.tax_rate ?? 15) / 100)).toFixed(2)} ر.س`}
                            </span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-theme-subtle pt-2 mt-2">
                            <span>الإجمالي</span>
                            <span className="text-gold">
                                {(
                                    300 +
                                    (!(shipping.shipping_enabled ?? true) ? 0 : 300 >= (shipping.free_above ?? 500) ? 0 : (shipping.flat_rate ?? 30)) +
                                    (!(shipping.tax_enabled ?? true) ? 0 : 300 * ((shipping.tax_rate ?? 15) / 100))
                                ).toFixed(2)} ر.س
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleSave("shipping", shipping)}
                    disabled={saving === "shipping"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "shipping" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات الشحن والضريبة
                </button>
            </SettingsCard>


            <SettingsCard title="قواعد التشغيل والتصعيد" icon={ShieldAlert}>
                <p className="text-theme-subtle text-sm mb-4">
                    هذه القواعد تتحكم في متى يرتفع التنبيه من مراقبة عادية إلى تحذير أو حالة حرجة.
                    استخدم القيمة <span className="font-bold text-theme">0</span> لتعطيل قاعدة بعينها.
                </p>

                <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme">جودة خدمة الدعم</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="حد تذاكر على حافة SLA"
                                value={String(operationalRules.support.slaAtRiskMin)}
                                onChange={(v) => updateOperationalRule("support", "slaAtRiskMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد تذاكر تجاوزت SLA"
                                value={String(operationalRules.support.slaBreachedMin)}
                                onChange={(v) => updateOperationalRule("support", "slaBreachedMin", v)}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme">المخزون والتنفيذ</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="حد العناصر النافدة الحرجة"
                                value={String(operationalRules.inventory.criticalStockoutsMin)}
                                onChange={(v) => updateOperationalRule("inventory", "criticalStockoutsMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد قائمة إعادة التعبئة"
                                value={String(operationalRules.inventory.restockPressureItemsMin)}
                                onChange={(v) => updateOperationalRule("inventory", "restockPressureItemsMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد إجمالي منخفض المخزون"
                                value={String(operationalRules.inventory.lowStockTotalMin)}
                                onChange={(v) => updateOperationalRule("inventory", "lowStockTotalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد التنفيذ لتصعيد النفاد إلى حرج"
                                value={String(operationalRules.inventory.fulfillmentQueueCriticalMin)}
                                onChange={(v) => updateOperationalRule("inventory", "fulfillmentQueueCriticalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme">المدفوعات والتحصيل</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="حد المدفوعات المتعثرة للتحذير"
                                value={String(operationalRules.payments.failedPaymentsWarningMin)}
                                onChange={(v) => updateOperationalRule("payments", "failedPaymentsWarningMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد المدفوعات المتعثرة للحالة الحرجة"
                                value={String(operationalRules.payments.failedPaymentsCriticalMin)}
                                onChange={(v) => updateOperationalRule("payments", "failedPaymentsCriticalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="إيراد معرض للخطر للتحذير (ر.س)"
                                value={String(operationalRules.payments.atRiskRevenueWarning)}
                                onChange={(v) => updateOperationalRule("payments", "atRiskRevenueWarning", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="إيراد معرض للخطر للحالة الحرجة (ر.س)"
                                value={String(operationalRules.payments.atRiskRevenueCritical)}
                                onChange={(v) => updateOperationalRule("payments", "atRiskRevenueCritical", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد المدفوعات المعلقة للتحذير"
                                value={String(operationalRules.payments.pendingPaymentsWarningMin)}
                                onChange={(v) => updateOperationalRule("payments", "pendingPaymentsWarningMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="حد المدفوعات المعلقة للحالة الحرجة"
                                value={String(operationalRules.payments.pendingPaymentsCriticalMin)}
                                onChange={(v) => updateOperationalRule("payments", "pendingPaymentsCriticalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="إيراد معلق للتحذير (ر.س)"
                                value={String(operationalRules.payments.outstandingRevenueWarning)}
                                onChange={(v) => updateOperationalRule("payments", "outstandingRevenueWarning", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="إيراد معلق للحالة الحرجة (ر.س)"
                                value={String(operationalRules.payments.outstandingRevenueCritical)}
                                onChange={(v) => updateOperationalRule("payments", "outstandingRevenueCritical", v)}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme">ضغط طابور الطلبات</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="مراجعات بانتظار القرار للتحذير"
                                value={String(operationalRules.orders.pendingReviewWarningMin)}
                                onChange={(v) => updateOperationalRule("orders", "pendingReviewWarningMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="مراجعات بانتظار القرار للحالة الحرجة"
                                value={String(operationalRules.orders.pendingReviewCriticalMin)}
                                onChange={(v) => updateOperationalRule("orders", "pendingReviewCriticalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="خط التنفيذ للتحذير"
                                value={String(operationalRules.orders.fulfillmentQueueWarningMin)}
                                onChange={(v) => updateOperationalRule("orders", "fulfillmentQueueWarningMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="خط التنفيذ للحالة الحرجة"
                                value={String(operationalRules.orders.fulfillmentQueueCriticalMin)}
                                onChange={(v) => updateOperationalRule("orders", "fulfillmentQueueCriticalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="طلبات بانتظار الدفع للتحذير"
                                value={String(operationalRules.orders.paymentPendingWarningMin)}
                                onChange={(v) => updateOperationalRule("orders", "paymentPendingWarningMin", v)}
                                type="number"
                                dir="ltr"
                            />
                            <Field
                                label="طلبات بانتظار الدفع للحالة الحرجة"
                                value={String(operationalRules.orders.paymentPendingCriticalMin)}
                                onChange={(v) => updateOperationalRule("orders", "paymentPendingCriticalMin", v)}
                                type="number"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {isOperationalRulesDirty && (
                    <div className="mt-5 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setOperationalRules(settings.operational_rules)}
                                className="inline-flex items-center gap-2 rounded-xl border border-theme-soft px-4 py-2 text-sm font-bold text-theme-soft transition-colors hover:border-gold hover:text-theme"
                            >
                                <RotateCcw className="w-4 h-4" />
                                إعادة الحالة المحفوظة
                            </button>
                            <button
                                type="button"
                                onClick={() => setOperationalRules(diagnostics.defaults)}
                                className="inline-flex items-center gap-2 rounded-xl border border-theme-soft px-4 py-2 text-sm font-bold text-theme-soft transition-colors hover:border-gold hover:text-theme"
                            >
                                <RotateCcw className="w-4 h-4" />
                                استعادة الافتراضي
                            </button>
                        </div>

                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4 space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-theme">محاكاة قبل/بعد</h4>
                                    <p className="text-xs leading-6 text-theme-subtle">
                                        {ruleChanges.length === 0
                                            ? "المقاييس الحالية لن تغيّر مستوى الإشارات، لكن العتبات الجديدة ستُحفظ كما هي."
                                            : `${ruleChanges.length} إشارات ستتأثر عند حفظ هذه المسودة.`}
                                    </p>
                                </div>
                                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-theme-soft">
                                    المسودة الحالية
                                </span>
                            </div>

                            {ruleChanges.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-theme-soft bg-surface/70 px-4 py-4 text-sm text-theme-subtle">
                                    لا توجد تغييرات مرئية على حالة الإشارات الآن، لكن يمكنك حفظ المسودة لتحديث العتبات التشغيلية.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {ruleChanges.map(({ groupTitle, currentSignal, draftSignal }) => (
                                        <div key={draftSignal.id} className="rounded-xl border border-theme-soft bg-surface/70 p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="text-sm font-bold text-theme">{draftSignal.title}</div>
                                                    <div className="text-xs text-theme-subtle">{groupTitle}</div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <SignalStateBadge state={currentSignal.state} />
                                                    <span className="text-xs text-theme-faint">← الحالي</span>
                                                    <SignalStateBadge state={draftSignal.state} />
                                                    <span className="text-xs text-theme-faint">المسودة →</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                                <div className="rounded-xl bg-white/5 px-3 py-3 text-theme-soft">
                                                    <div className="mb-1 font-bold text-theme">الآن</div>
                                                    <div>{currentSignal.currentLabel}</div>
                                                    <div className="text-theme-subtle">العتبة: {currentSignal.thresholdLabel}</div>
                                                </div>
                                                <div className="rounded-xl bg-gold/5 px-3 py-3 text-theme-soft">
                                                    <div className="mb-1 font-bold text-theme">بعد الحفظ</div>
                                                    <div>{draftSignal.currentLabel}</div>
                                                    <div className="text-theme-subtle">العتبة: {draftSignal.thresholdLabel}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <button
                    onClick={() => handleSave("operational_rules", operationalRules)}
                    disabled={saving === "operational_rules"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "operational_rules" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ قواعد التشغيل
                </button>
            </SettingsCard>

            <SettingsCard title="معاينة القواعد الحالية" icon={Activity}>
                <div className="space-y-4">
                    {ruleSections.map((section) => (
                        <div key={section.key} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-bold text-sm text-theme">{section.title}</h4>
                                <span className="text-xs text-theme-subtle">{section.signals.length} إشارات</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {section.signals.map((signal) => (
                                    <div key={signal.id} className="rounded-xl border border-theme-soft bg-surface/70 p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="text-sm font-bold text-theme">{signal.title}</div>
                                                <p className="text-xs text-theme-subtle leading-6">{signal.description}</p>
                                            </div>
                                            <SignalStateBadge state={signal.state} />
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="rounded-full bg-white/5 px-3 py-1.5 text-theme-soft">
                                                الحالي: {signal.currentLabel}
                                            </span>
                                            <span className="rounded-full bg-white/5 px-3 py-1.5 text-theme-subtle">
                                                العتبة: {signal.thresholdLabel}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </SettingsCard>

            <SettingsCard title="سجل تغييرات القواعد" icon={History}>
                {diagnostics.recentChanges.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-theme-soft bg-theme-faint px-4 py-5 text-sm text-theme-subtle">
                        لا توجد تغييرات مسجلة بعد على قواعد التشغيل.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {diagnostics.recentChanges.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-theme-soft bg-theme-faint px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm font-bold text-theme">{entry.message}</div>
                                    <div className="text-xs text-theme-subtle">
                                        {new Date(entry.createdAt).toLocaleString("ar-SA")}
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-theme-subtle">
                                    بواسطة: <span className="text-theme-soft font-semibold">{entry.actor}</span>
                                </div>
                                {entry.changedKeys.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {entry.changedKeys.map((changedKey) => (
                                            <span key={changedKey} className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-theme-soft">
                                                {changedKey}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </SettingsCard>

            {/* ─── 4. معرفات المنتجات والـ SKU ─── */}
            <SettingsCard title="معرفات المنتجات والـ SKU" icon={QrCode}>
                <p className="text-theme-subtle text-sm mb-4">كل منتج يصدر بمعرف فريد تلقائياً. القالب: {productIdentifiers.prefix}-P-00001-NA-NA (النوع-تسلسل-المقاس-اللون)</p>
                <div className="space-y-4">
                    <Field
                        label="البادئة (مثال: WSH, WUSHA)"
                        value={productIdentifiers.prefix}
                        onChange={(v) => setProductIdentifiers({ ...productIdentifiers, prefix: v.toUpperCase().replace(/\s/g, "") })}
                        placeholder="WSH"
                        dir="ltr"
                    />
                    <p className="text-[10px] text-theme-faint">التسلسل ذري ولا يتكرر. التعديل يؤثر على المنتجات الجديدة فقط.</p>
                </div>
                <button
                    onClick={() => handleSave("product_identifiers", {
                        prefix: productIdentifiers.prefix,
                        product_code_template: productIdentifiers.product_code_template,
                        sku_template: productIdentifiers.sku_template,
                        type_map: settings.product_identifiers?.type_map ?? { print: "P", apparel: "T", digital: "D", nft: "N", original: "O" },
                    })}
                    disabled={saving === "product_identifiers"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "product_identifiers" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات المعرفات
                </button>
            </SettingsCard>

            {/* ─── 5. أسعار القطع (صمّم قطعتك) ─── */}
            <SettingsCard title="أسعار القطع — صمّم قطعتك" icon={Tag}>
                <p className="text-theme-subtle text-sm mb-4">أسعار التيشيرت والهودي والبلوفر في مسار التصميم المخصص</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field
                        label="تيشيرت (ر.س)"
                        value={String(creationPrices.tshirt)}
                        onChange={(v) => setCreationPrices({ ...creationPrices, tshirt: Number(v) || 0 })}
                        type="number"
                        dir="ltr"
                    />
                    <Field
                        label="هودي (ر.س)"
                        value={String(creationPrices.hoodie)}
                        onChange={(v) => setCreationPrices({ ...creationPrices, hoodie: Number(v) || 0 })}
                        type="number"
                        dir="ltr"
                    />
                    <Field
                        label="بلوفر (ر.س)"
                        value={String(creationPrices.pullover)}
                        onChange={(v) => setCreationPrices({ ...creationPrices, pullover: Number(v) || 0 })}
                        type="number"
                        dir="ltr"
                    />
                </div>
                <button
                    onClick={() => handleSave("creation_prices", creationPrices)}
                    disabled={saving === "creation_prices"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "creation_prices" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ الأسعار
                </button>
            </SettingsCard>

            {/* ─── 6. AI Simulation Config ─── */}
            <SettingsCard title="إعدادات محاكاة الذكاء الاصطناعي" icon={Sparkles || Tag}>
                <p className="text-theme-subtle text-sm mb-4">تتحكم هذه الإعدادات بالصور والنصوص التي تظهر في قسم "اكتشف بذكاء" (محاكاة التصميم) على الصفحة الرئيسية.</p>
                
                <div className="space-y-6">
                    {/* Step 1 Settings */}
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme mb-2">الخطوة 1: اختيار القطعة</h4>
                        <Field
                            label="اسم اللون / الموديل"
                            value={aiSimulation.step1_color_name}
                            onChange={(v) => setAiSimulation({ ...aiSimulation, step1_color_name: v })}
                            placeholder="أسود كلاسيك"
                        />
                        <Field
                            label="النمط (Pattern)"
                            value={aiSimulation.step1_pattern}
                            onChange={(v) => setAiSimulation({ ...aiSimulation, step1_pattern: v })}
                            placeholder="بدون نمط"
                        />
                        <div>
                            <label className="text-xs text-theme-subtle font-medium block mb-2">صورة القطعة (Garment Image)</label>
                            <div className="flex items-center gap-3">
                                {aiSimulation.step1_image && (
                                    <div className="w-12 h-12 rounded-lg border border-theme-soft bg-black flex-shrink-0 relative overflow-hidden">
                                        <img src={aiSimulation.step1_image} alt="Step 1 Preview" className="absolute inset-0 w-full h-full object-contain" />
                                    </div>
                                )}
                                <label className={`flex-1 flex items-center justify-center p-3 border border-dashed rounded-xl cursor-pointer transition-colors ${saving === "uploading_step1_image" ? "opacity-50 cursor-not-allowed border-theme-subtle" : "border-gold/30 hover:border-gold hover:bg-gold/5"}`}>
                                    {saving === "uploading_step1_image" ? <Loader2 className="w-4 h-4 animate-spin text-theme-subtle" /> : <span className="text-sm font-medium text-theme-soft">اختر صورة جديدة...</span>}
                                    <input type="file" accept="image/*" className="hidden" disabled={saving === "uploading_step1_image"} onChange={(e) => handleImageUpload(e, "step1_image")} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 Settings */}
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme mb-2">الخطوة 2 و 3: الإلهام والنتيجة</h4>
                        <Field
                            label="نص الطلب الوهمي (Prompt)"
                            value={aiSimulation.step2_prompt}
                            onChange={(v) => setAiSimulation({ ...aiSimulation, step2_prompt: v })}
                            placeholder="صمم لي ذئب بستايل سايبربانك..."
                        />
                        <Field
                            label="أسلوب الرسم (Art Style)"
                            value={aiSimulation.step2_art_style}
                            onChange={(v) => setAiSimulation({ ...aiSimulation, step2_art_style: v })}
                            placeholder="رسم رقمي (Digital Art)"
                        />
                        <div>
                            <label className="text-xs text-theme-subtle font-medium block mb-2">صورة التصميم المُولد (Result Image)</label>
                            <div className="flex items-center gap-3">
                                {aiSimulation.step2_result_image && (
                                    <div className="w-12 h-12 rounded-lg border border-theme-soft bg-black flex-shrink-0 relative overflow-hidden">
                                        <img src={aiSimulation.step2_result_image} alt="Step 2 Preview" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                )}
                                <label className={`flex-1 flex items-center justify-center p-3 border border-dashed rounded-xl cursor-pointer transition-colors ${saving === "uploading_step2_result_image" ? "opacity-50 cursor-not-allowed border-theme-subtle" : "border-gold/30 hover:border-gold hover:bg-gold/5"}`}>
                                    {saving === "uploading_step2_result_image" ? <Loader2 className="w-4 h-4 animate-spin text-theme-subtle" /> : <span className="text-sm font-medium text-theme-soft">اختر صورة جديدة...</span>}
                                    <input type="file" accept="image/*" className="hidden" disabled={saving === "uploading_step2_result_image"} onChange={(e) => handleImageUpload(e, "step2_result_image")} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 Settings */}
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme mb-2">الخطوة 3: النتيجة النهائية (الموك أب)</h4>
                        <p className="text-xs text-theme-subtle mb-2">الصورة النهائية التي ستظهر في الخطوة الأخيرة (محاكاة الموك أب الاحترافي).</p>
                        <div>
                            <div className="flex items-center gap-3">
                                {aiSimulation.step3_final_image && (
                                    <div className="w-16 h-16 rounded-lg border border-theme-soft bg-black flex-shrink-0 relative overflow-hidden">
                                        <img src={aiSimulation.step3_final_image} alt="Step 3 Preview" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                )}
                                <label className={`flex-1 flex items-center justify-center p-3 h-16 border border-dashed rounded-xl cursor-pointer transition-colors ${saving === "uploading_step3_final_image" ? "opacity-50 cursor-not-allowed border-theme-subtle" : "border-gold/30 hover:border-gold hover:bg-gold/5"}`}>
                                    {saving === "uploading_step3_final_image" ? <Loader2 className="w-4 h-4 animate-spin text-theme-subtle" /> : <span className="text-sm font-medium text-theme-soft">اختر صورة الموك أب...</span>}
                                    <input type="file" accept="image/*" className="hidden" disabled={saving === "uploading_step3_final_image"} onChange={(e) => handleImageUpload(e, "step3_final_image")} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => handleSave("ai_simulation", aiSimulation)}
                    disabled={saving === "ai_simulation"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "ai_simulation" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات المحاكاة
                </button>
            </SettingsCard>

            {/* ─── 7. Brand Assets Config ─── */}
            <SettingsCard title="إعدادات بطاقات الهوية والتصاميم" icon={ImageIcon}>
                <p className="text-theme-subtle text-sm mb-4">تتحكم هذه الإعدادات بالنصوص المعروضة على بطاقات التصاميم (في صفحة /brand).</p>
                
                <div className="space-y-6">
                    {/* Business Card Settings */}
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme mb-2">بطاقة العمل (Business Card)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="الاسم"
                                value={brandAssets.business_card_name}
                                onChange={(v) => setBrandAssets({ ...brandAssets, business_card_name: v })}
                                placeholder="هشام الزهراني"
                            />
                            <Field
                                label="المسمى الوظيفي"
                                value={brandAssets.business_card_title}
                                onChange={(v) => setBrandAssets({ ...brandAssets, business_card_title: v })}
                                placeholder="المدير التنفيذي"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="رقم الهاتف"
                                value={brandAssets.business_card_phone}
                                onChange={(v) => setBrandAssets({ ...brandAssets, business_card_phone: v })}
                                placeholder="+966..."
                                dir="ltr"
                            />
                            <Field
                                label="البريد الإلكتروني"
                                value={brandAssets.business_card_email}
                                onChange={(v) => setBrandAssets({ ...brandAssets, business_card_email: v })}
                                placeholder="washaksa@hotmail.com"
                                dir="ltr"
                            />
                        </div>
                        <Field
                            label="الموقع الإلكتروني"
                            value={brandAssets.business_card_website}
                            onChange={(v) => setBrandAssets({ ...brandAssets, business_card_website: v })}
                            placeholder="www.washa.shop"
                            dir="ltr"
                        />
                    </div>

                    {/* Thank You Card Settings */}
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme mb-2">بطاقة شكر وتقدير (Thank You Card)</h4>
                        <Field
                            label="العنوان"
                            value={brandAssets.thank_you_title}
                            onChange={(v) => setBrandAssets({ ...brandAssets, thank_you_title: v })}
                            placeholder="شكراً لثقتكم"
                        />
                        <div className="space-y-2">
                            <label className="text-xs text-theme-subtle font-medium block">رسالة الشكر</label>
                            <textarea
                                value={brandAssets.thank_you_message}
                                onChange={(e) => setBrandAssets({ ...brandAssets, thank_you_message: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors min-h-[120px]"
                                placeholder="الرسالة الترحيبية..."
                            />
                        </div>
                        <Field
                            label="حساب التواصل (Handle)"
                            value={brandAssets.thank_you_handle}
                            onChange={(v) => setBrandAssets({ ...brandAssets, thank_you_handle: v })}
                            placeholder="@washha.sa"
                            dir="ltr"
                        />
                    </div>

                    {/* Social Media Links Settings */}
                    <div className="p-4 rounded-xl border border-theme-subtle bg-theme-faint space-y-4">
                        <h4 className="font-bold text-sm text-theme mb-2">منصة الروابط (Linktree Profile)</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2 pb-4 border-b border-theme-strong/10">
                            <Field
                                label="العنوان الرئيسي للمنصة"
                                value={brandAssets.linktree_title}
                                onChange={(v) => setBrandAssets({ ...brandAssets, linktree_title: v })}
                                placeholder="وشّى منصة الفن"
                            />
                            <Field
                                label="النص الفرعي (Subtitle)"
                                value={brandAssets.linktree_subtitle}
                                onChange={(v) => setBrandAssets({ ...brandAssets, linktree_subtitle: v })}
                                placeholder="الإبداع بين يديك"
                            />
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-sm text-theme">روابط المنصات والحسابات</h4>
                            <span className="text-xs text-theme-subtle">الغي التحديد لإخفاء المنصة من صفحة الروابط</span>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            
                            {/* Instagram */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-theme-strong/10 bg-theme-base/50">
                                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={brandAssets.show_instagram !== false} 
                                        onChange={(e) => setBrandAssets({ ...brandAssets, show_instagram: e.target.checked })} 
                                        className="w-4 h-4 rounded text-gold focus:ring-gold border-theme-strong/20"
                                    />
                                    <span className="text-sm font-bold text-theme">Instagram</span>
                                </label>
                                <div className="flex-1 opacity-100 transition-opacity" style={{ opacity: brandAssets.show_instagram === false ? 0.5 : 1 }}>
                                    <input
                                        className="w-full px-4 py-2 bg-theme-strong/5 border border-theme-strong/10 rounded-lg text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors"
                                        value={brandAssets.social_instagram}
                                        onChange={(e) => setBrandAssets({ ...brandAssets, social_instagram: e.target.value })}
                                        placeholder="@wusha.art"
                                        dir="ltr"
                                        disabled={brandAssets.show_instagram === false}
                                    />
                                </div>
                            </div>

                            {/* Twitter */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-theme-strong/10 bg-theme-base/50">
                                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={brandAssets.show_twitter !== false} 
                                        onChange={(e) => setBrandAssets({ ...brandAssets, show_twitter: e.target.checked })} 
                                        className="w-4 h-4 rounded text-gold focus:ring-gold border-theme-strong/20"
                                    />
                                    <span className="text-sm font-bold text-theme">Twitter (X)</span>
                                </label>
                                <div className="flex-1 transition-opacity" style={{ opacity: brandAssets.show_twitter === false ? 0.5 : 1 }}>
                                    <input
                                        className="w-full px-4 py-2 bg-theme-strong/5 border border-theme-strong/10 rounded-lg text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors"
                                        value={brandAssets.social_twitter}
                                        onChange={(e) => setBrandAssets({ ...brandAssets, social_twitter: e.target.value })}
                                        placeholder="@wusha_art"
                                        dir="ltr"
                                        disabled={brandAssets.show_twitter === false}
                                    />
                                </div>
                            </div>

                            {/* TikTok */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-theme-strong/10 bg-theme-base/50">
                                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={brandAssets.show_tiktok !== false} 
                                        onChange={(e) => setBrandAssets({ ...brandAssets, show_tiktok: e.target.checked })} 
                                        className="w-4 h-4 rounded text-gold focus:ring-gold border-theme-strong/20"
                                    />
                                    <span className="text-sm font-bold text-theme">TikTok</span>
                                </label>
                                <div className="flex-1 transition-opacity" style={{ opacity: brandAssets.show_tiktok === false ? 0.5 : 1 }}>
                                    <input
                                        className="w-full px-4 py-2 bg-theme-strong/5 border border-theme-strong/10 rounded-lg text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors"
                                        value={brandAssets.social_tiktok}
                                        onChange={(e) => setBrandAssets({ ...brandAssets, social_tiktok: e.target.value })}
                                        placeholder="@wusha.art"
                                        dir="ltr"
                                        disabled={brandAssets.show_tiktok === false}
                                    />
                                </div>
                            </div>

                            {/* Snapchat */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-theme-strong/10 bg-theme-base/50">
                                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={brandAssets.show_snapchat !== false} 
                                        onChange={(e) => setBrandAssets({ ...brandAssets, show_snapchat: e.target.checked })} 
                                        className="w-4 h-4 rounded text-gold focus:ring-gold border-theme-strong/20"
                                    />
                                    <span className="text-sm font-bold text-theme">Snapchat</span>
                                </label>
                                <div className="flex-1 transition-opacity" style={{ opacity: brandAssets.show_snapchat === false ? 0.5 : 1 }}>
                                    <input
                                        className="w-full px-4 py-2 bg-theme-strong/5 border border-theme-strong/10 rounded-lg text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors"
                                        value={brandAssets.social_snapchat}
                                        onChange={(e) => setBrandAssets({ ...brandAssets, social_snapchat: e.target.value })}
                                        placeholder="@wusha.art"
                                        dir="ltr"
                                        disabled={brandAssets.show_snapchat === false}
                                    />
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-theme-strong/10 bg-theme-base/50">
                                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={brandAssets.show_whatsapp !== false} 
                                        onChange={(e) => setBrandAssets({ ...brandAssets, show_whatsapp: e.target.checked })} 
                                        className="w-4 h-4 rounded text-gold focus:ring-gold border-theme-strong/20"
                                    />
                                    <span className="text-sm font-bold text-theme">WhatsApp</span>
                                </label>
                                <div className="flex-1 transition-opacity" style={{ opacity: brandAssets.show_whatsapp === false ? 0.5 : 1 }}>
                                    <input
                                        className="w-full px-4 py-2 bg-theme-strong/5 border border-theme-strong/10 rounded-lg text-theme-strong text-sm focus:border-gold focus:outline-none transition-colors"
                                        value={brandAssets.social_whatsapp}
                                        onChange={(e) => setBrandAssets({ ...brandAssets, social_whatsapp: e.target.value })}
                                        placeholder="+966532235005"
                                        dir="ltr"
                                        disabled={brandAssets.show_whatsapp === false}
                                    />
                                </div>
                            </div>
                            
                            {/* Website Link (using existing website field) */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-theme-strong/10 bg-theme-base/50">
                                <label className="flex items-center gap-2 cursor-pointer w-32 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={brandAssets.show_website !== false} 
                                        onChange={(e) => setBrandAssets({ ...brandAssets, show_website: e.target.checked })} 
                                        className="w-4 h-4 rounded text-gold focus:ring-gold border-theme-strong/20"
                                    />
                                    <span className="text-sm font-bold text-theme">الموقع الإلكتروني</span>
                                </label>
                                <div className="flex-1 transition-opacity" style={{ opacity: brandAssets.show_website === false ? 0.5 : 1 }}>
                                    <div className="text-xs text-theme-subtle px-2">مستمد من إعدادات بطاقة العمل الأساسية أعلاه</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => handleSave("brand_assets", brandAssets)}
                    disabled={saving === "brand_assets"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "brand_assets" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ نصوص البطاقات
                </button>
            </SettingsCard>
        </div>
    );
}
