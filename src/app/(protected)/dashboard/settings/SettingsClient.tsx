"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Eye, EyeOff, Globe, Truck, Save, Loader2, Tag, QrCode,
    Instagram, Twitter, Mail, Phone, Sparkles, type LucideIcon,
} from "lucide-react";
import { updateSiteSetting, uploadExclusiveDesignImage, type SiteSettingsType } from "@/app/actions/settings";

interface SettingsProps {
    settings: SiteSettingsType;
}

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

// ═══════════════════════════════════════════════════════════

export function SettingsClient({ settings }: SettingsProps) {
    const [visibility, setVisibility] = useState({
        gallery: settings.visibility.gallery ?? false,
        store: settings.visibility.store ?? false,
        signup: settings.visibility.signup ?? false,
        join: settings.visibility.join ?? true,
        join_artist: settings.visibility.join_artist ?? true,
        ai_section: settings.visibility.ai_section ?? true,
        hero_auth_buttons: settings.visibility.hero_auth_buttons ?? true,
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
        step1_image: settings.ai_simulation?.step1_image ?? "/images/design/heavy-tshirt-black-front.png",
        step1_color_name: settings.ai_simulation?.step1_color_name ?? "أسود كلاسيك",
        step1_pattern: settings.ai_simulation?.step1_pattern ?? "بدون نمط",
        step2_prompt: settings.ai_simulation?.step2_prompt ?? "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...",
        step2_art_style: settings.ai_simulation?.step2_art_style ?? "رسم رقمي (Digital Art)",
        step2_result_image: settings.ai_simulation?.step2_result_image ?? "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80",
    });

    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async (key: string, value: Record<string, any>) => {
        setSaving(key);
        const result = await updateSiteSetting(key, value);
        setSaving(null);
        if (result.success) {
            showToast("تم الحفظ بنجاح ✓");
        } else {
            showToast("خطأ: " + (result.error || "حدث خطأ"));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: "step1_image" | "step2_result_image") => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(`uploading_${fieldKey}`);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Using the same helper used for exclusive designs for general image uploads
            const res = await uploadExclusiveDesignImage(formData);
            if (res.success) {
                setAiSimulation((prev) => ({ ...prev, [fieldKey]: res.url }));
                showToast("تم رفع الصورة بنجاح");
            } else {
                showToast("فشل الرفع: " + res.error);
            }
        } catch (error) {
            showToast("فشل الرفع");
        } finally {
            setSaving(null);
        }
    };

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
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field
                            label="تكلفة الشحن الثابتة (ر.س)"
                            value={String(shipping.flat_rate)}
                            onChange={(v) => setShipping({ ...shipping, flat_rate: Number(v) || 0 })}
                            type="number"
                            dir="ltr"
                        />
                        <Field
                            label="شحن مجاني فوق (ر.س)"
                            value={String(shipping.free_above)}
                            onChange={(v) => setShipping({ ...shipping, free_above: Number(v) || 0 })}
                            type="number"
                            dir="ltr"
                        />
                        <Field
                            label="نسبة الضريبة (%)"
                            value={String(shipping.tax_rate)}
                            onChange={(v) => setShipping({ ...shipping, tax_rate: Number(v) || 0 })}
                            type="number"
                            dir="ltr"
                        />
                    </div>
                </div>
                <button
                    onClick={() => handleSave("shipping", shipping)}
                    disabled={saving === "shipping"}
                    className="mt-5 btn-gold w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving === "shipping" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ إعدادات الشحن
                </button>
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
        </div>
    );
}
