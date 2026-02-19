"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Eye, EyeOff, Globe, Truck, Save, Loader2,
    Instagram, Twitter, Mail, Phone, type LucideIcon,
} from "lucide-react";
import { updateSiteSetting } from "@/app/actions/settings";

interface SettingsProps {
    settings: {
        visibility: Record<string, boolean>;
        site_info: Record<string, string>;
        shipping: Record<string, number>;
    };
}

// ─── Toggle Switch ──────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all group"
        >
            <div className="flex items-center gap-3">
                {checked ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-fg/20" />}
                <span className="text-sm font-medium text-fg/70">{label}</span>
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
        <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gold/10">
                    <Icon className="w-4 h-4 text-gold" />
                </div>
                <h3 className="font-bold text-fg text-sm">{title}</h3>
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
            <label className="text-xs text-fg/40 font-medium">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    dir={dir}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-fg/80 text-sm focus:border-gold focus:outline-none transition-colors placeholder:text-fg/15"
                />
                {Icon && <Icon className="absolute left-3 top-2.5 w-4 h-4 text-fg/20 pointer-events-none" />}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════

export function SettingsClient({ settings }: SettingsProps) {
    const [visibility, setVisibility] = useState(settings.visibility);
    const [siteInfo, setSiteInfo] = useState(settings.site_info);
    const [shipping, setShipping] = useState(settings.shipping);

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
                        label="قسم الذكاء الاصطناعي (AI)"
                        checked={visibility.ai_section}
                        onChange={(v) => setVisibility({ ...visibility, ai_section: v })}
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
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                            label="اسم الموقع"
                            value={siteInfo.name}
                            onChange={(v) => setSiteInfo({ ...siteInfo, name: v })}
                            placeholder="وشّى"
                        />
                        <Field
                            label="البريد الإلكتروني"
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
        </div>
    );
}
