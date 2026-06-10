"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Tag, Percent, Copy, Check, Trash2, Power, Zap, Loader2,
    TrendingUp, AlertTriangle, Clock, Gift,
} from "lucide-react";
import { createDiscountCoupon, deleteDiscountCoupon, toggleCouponStatus } from "@/app/actions/discount-coupons";
import type { Database } from "@/types/database";

type Coupon = Database["public"]["Tables"]["discount_coupons"]["Row"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(validUntil: string | null): number | null {
    if (!validUntil) return null;
    const diff = new Date(validUntil).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function usagePercent(coupon: Coupon): number {
    if (!coupon.max_uses || coupon.max_uses <= 0) return 0;
    return Math.min(100, Math.round((coupon.current_uses / coupon.max_uses) * 100));
}

function getCouponStatus(coupon: Coupon): "active" | "inactive" | "expired" | "exhausted" {
    if (!coupon.is_active) return "inactive";
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return "expired";
    if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) return "exhausted";
    return "active";
}

const STATUS_META = {
    active:    { label: "نشط",    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
    inactive:  { label: "موقوف", className: "border-theme-subtle bg-theme-faint text-theme-faint" },
    expired:   { label: "منتهي", className: "border-red-500/20 bg-red-500/10 text-red-400" },
    exhausted: { label: "مُستنفد", className: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function CouponsClient({ initialCoupons }: { initialCoupons: Coupon[] }) {
    const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formError, setFormError] = useState("");
    const [globalError, setGlobalError] = useState("");
    const [copiedCode, setCopiedCode] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form state
    const [code, setCode] = useState("");
    const [type, setType] = useState<"percentage" | "fixed">("percentage");
    const [value, setValue] = useState("");
    const [maxUses, setMaxUses] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [details, setDetails] = useState("");

    // ── Analytics ─────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const active    = coupons.filter(c => getCouponStatus(c) === "active").length;
        const expired   = coupons.filter(c => getCouponStatus(c) === "expired").length;
        const exhausted = coupons.filter(c => getCouponStatus(c) === "exhausted").length;
        const totalUses = coupons.reduce((s, c) => s + (c.current_uses || 0), 0);
        const topCoupon = [...coupons].sort((a, b) => (b.current_uses || 0) - (a.current_uses || 0))[0];
        const expiringSoon = coupons.filter(c => {
            const d = getDaysLeft(c.valid_until);
            return d !== null && d > 0 && d <= 7 && getCouponStatus(c) === "active";
        }).length;
        return { active, expired, exhausted, totalUses, topCoupon, expiringSoon };
    }, [coupons]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const openCreate = () => {
        setCode(""); setType("percentage"); setValue(""); setMaxUses("");
        setValidUntil(""); setDetails(""); setFormError("");
        setIsCreating(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        // Client-side validation
        const numVal = Number(value);
        if (!code.trim()) { setFormError("يرجى إدخال كود الخصم"); return; }
        if (numVal <= 0)   { setFormError("قيمة الخصم يجب أن تكون أكبر من صفر"); return; }
        if (type === "percentage" && numVal > 100) { setFormError("نسبة الخصم لا يمكن أن تتجاوز 100%"); return; }

        setIsSubmitting(true);
        try {
            const result = await createDiscountCoupon({
                code,
                discount_type: type,
                discount_value: numVal,
                max_uses: maxUses ? Number(maxUses) : 0,
                valid_until: validUntil ? new Date(validUntil).toISOString() : null,
                details: details || null,
                is_active: true,
            });

            if (result.error) { setFormError(result.error); return; }

            if (result.data) {
                setCoupons(prev => [result.data as Coupon, ...prev]);
                setIsCreating(false);
            }
        } catch (err: any) {
            setFormError(err.message || "حدث خطأ غير متوقع");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const result = await toggleCouponStatus(id, currentStatus);
        if (result.success) {
            setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        }
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        setIsDeleting(true);
        const targetId = confirmDeleteId;
        const result = await deleteDiscountCoupon(targetId);
        setIsDeleting(false);
        setConfirmDeleteId(null);
        if (result.success) {
            setCoupons(prev => prev.filter(c => c.id !== targetId));
            return;
        }
        setGlobalError(result.error || "تعذر حذف كود الخصم الآن.");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(""), 2000);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {globalError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {globalError}
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint uppercase">Discount Campaigns</p>
                    <h1 className="mt-1 text-2xl font-black text-theme sm:text-3xl">كوبونات الخصم</h1>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-2.5 text-sm font-bold text-gold transition-colors hover:bg-gold/20"
                >
                    <Plus className="h-4 w-4" />
                    كوبون جديد
                </button>
            </div>

            {/* ── Analytics Strip ── */}
            {coupons.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "نشطة",     value: String(stats.active),     icon: Gift,       color: "text-emerald-400" },
                        { label: "استخدامات", value: String(stats.totalUses),  icon: TrendingUp, color: "text-gold" },
                        { label: "تنتهي قريباً", value: String(stats.expiringSoon), icon: Clock, color: stats.expiringSoon > 0 ? "text-amber-400" : "text-theme-faint" },
                        { label: "منتهية/مُستنفدة", value: String(stats.expired + stats.exhausted), icon: AlertTriangle, color: stats.expired + stats.exhausted > 0 ? "text-red-400" : "text-theme-faint" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="theme-surface-panel rounded-[20px] p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className={`h-3.5 w-3.5 ${color}`} />
                                <p className="text-[10px] font-bold tracking-wider text-theme-faint uppercase">{label}</p>
                            </div>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Coupons Grid ── */}
            {coupons.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {coupons.map((coupon) => {
                        const status = getCouponStatus(coupon);
                        const sm = STATUS_META[status];
                        const pct = usagePercent(coupon);
                        const daysLeft = getDaysLeft(coupon.valid_until);
                        const isActive = status === "active";

                        return (
                            <motion.div
                                key={coupon.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`relative overflow-hidden rounded-[24px] border p-5 transition-all ${
                                    isActive
                                        ? "theme-surface-panel hover:border-gold/30"
                                        : "border-theme-subtle bg-theme-faint opacity-75"
                                }`}
                            >
                                {/* Status pill */}
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${isActive ? "border-gold/30 bg-gold/10 text-gold" : "border-theme-subtle bg-theme-faint text-theme-faint"}`}>
                                            {coupon.discount_type === "percentage"
                                                ? <Percent className="h-5 w-5" />
                                                : <Tag className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xl font-black text-theme tracking-widest">{coupon.code}</p>
                                                <button
                                                    onClick={() => copyToClipboard(coupon.code)}
                                                    className="text-theme-faint transition-colors hover:text-gold"
                                                >
                                                    {copiedCode === coupon.code
                                                        ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                        : <Copy className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                            <p className="text-sm font-semibold text-theme-soft">
                                                {coupon.discount_type === "percentage"
                                                    ? `خصم ${coupon.discount_value}%`
                                                    : `خصم ${Number(coupon.discount_value).toLocaleString("ar-SA")} ر.س`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${sm.className}`}>
                                        {sm.label}
                                    </span>
                                </div>

                                {/* Usage bar */}
                                <div className="mb-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-theme-faint">الاستخدام</span>
                                        <span className="font-mono font-bold text-theme">
                                            {coupon.current_uses} / {coupon.max_uses === 0 ? "∞" : coupon.max_uses}
                                        </span>
                                    </div>
                                    {coupon.max_uses > 0 && (
                                        <div className="h-1.5 overflow-hidden rounded-full bg-theme-faint">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Meta row */}
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    {coupon.valid_until && (
                                        <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                            status === "expired" ? "border-red-500/20 text-red-400"
                                            : daysLeft !== null && daysLeft <= 7 ? "border-amber-500/20 text-amber-400"
                                            : "border-theme-subtle text-theme-faint"
                                        }`}>
                                            <Clock className="h-3 w-3" />
                                            {status === "expired"
                                                ? "انتهت صلاحيته"
                                                : daysLeft !== null && daysLeft <= 0
                                                    ? "ينتهي اليوم"
                                                    : daysLeft !== null && daysLeft <= 7
                                                        ? `${daysLeft} أيام متبقية`
                                                        : formatDate(coupon.valid_until)}
                                        </span>
                                    )}
                                    {coupon.details && (
                                        <span className="truncate max-w-[160px] rounded-full border border-theme-subtle px-2 py-0.5 text-[11px] text-theme-faint">
                                            {coupon.details}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 border-t border-theme-faint pt-4">
                                    <button
                                        onClick={() => handleToggle(coupon.id, coupon.is_active)}
                                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                                            coupon.is_active
                                                ? "border-theme-subtle bg-theme-faint text-theme-soft hover:bg-theme-subtle"
                                                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                                        }`}
                                    >
                                        {coupon.is_active ? <Power className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                                        {coupon.is_active ? "إيقاف" : "تفعيل"}
                                    </button>
                                    <button
                                        onClick={() => { setGlobalError(""); setConfirmDeleteId(coupon.id); }}
                                        className="rounded-xl border border-theme-subtle bg-theme-faint p-2 text-theme-faint transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-[28px] border border-dashed border-theme-subtle bg-theme-faint py-20 text-center">
                    <Tag className="mx-auto mb-4 h-12 w-12 text-theme-faint" />
                    <h3 className="text-lg font-bold text-theme">لا توجد كوبونات بعد</h3>
                    <p className="mt-1 text-sm text-theme-faint">أنشئ أول كوبون خصم لحملاتك التسويقية</p>
                    <button
                        onClick={openCreate}
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-2.5 text-sm font-bold text-gold hover:bg-gold/20"
                    >
                        <Plus className="h-4 w-4" />
                        كوبون جديد
                    </button>
                </div>
            )}

            {/* ═══ Create Modal ════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.97, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.97, y: 16 }}
                            className="theme-surface-panel w-full max-w-md overflow-y-auto rounded-[28px] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.2)] max-h-[90vh]"
                        >
                            <p className="text-[11px] font-bold tracking-[0.3em] text-theme-faint uppercase">Discount Campaign</p>
                            <h2 className="mt-2 text-xl font-black text-theme">إنشاء كود خصم</h2>

                            {formError && (
                                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="mt-5 space-y-4">
                                {/* Code */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-theme">كود الخصم</label>
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                                        className="input-dark w-full rounded-2xl px-4 py-2.5 font-mono tracking-widest uppercase"
                                        placeholder="WASHA20"
                                        maxLength={32}
                                    />
                                    <p className="mt-1 text-[11px] text-theme-faint">أحرف إنجليزية كبيرة، أرقام، شرطات فقط</p>
                                </div>

                                {/* Type + Value */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-theme">نوع الخصم</label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value as "percentage" | "fixed")}
                                            className="input-dark w-full rounded-2xl px-4 py-2.5 text-sm"
                                        >
                                            <option value="percentage">نسبة مئوية (%)</option>
                                            <option value="fixed">مبلغ ثابت (ر.س)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-theme">
                                            {type === "percentage" ? "النسبة (1–100%)" : "المبلغ (ر.س)"}
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0.01"
                                            max={type === "percentage" ? "100" : "10000"}
                                            step={type === "percentage" ? "1" : "0.01"}
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            className="input-dark w-full rounded-2xl px-4 py-2.5 text-sm"
                                            placeholder={type === "percentage" ? "20" : "50"}
                                        />
                                    </div>
                                </div>

                                {/* Max uses + Expiry */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-theme">الحد الأقصى للاستخدام</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={maxUses}
                                            onChange={(e) => setMaxUses(e.target.value)}
                                            className="input-dark w-full rounded-2xl px-4 py-2.5 text-sm"
                                            placeholder="∞ بلا حد"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-theme">تاريخ الانتهاء</label>
                                        <input
                                            type="datetime-local"
                                            value={validUntil}
                                            onChange={(e) => setValidUntil(e.target.value)}
                                            className="input-dark w-full rounded-2xl px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Details */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-theme">ملاحظات (اختياري)</label>
                                    <input
                                        type="text"
                                        value={details}
                                        onChange={(e) => setDetails(e.target.value)}
                                        className="input-dark w-full rounded-2xl px-4 py-2.5 text-sm"
                                        placeholder="مثال: خصم اليوم الوطني"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 rounded-2xl border border-theme-subtle bg-theme-faint py-2.5 text-sm font-semibold text-theme-soft transition-colors hover:bg-theme-subtle"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold py-2.5 text-sm font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold/90 disabled:opacity-50"
                                    >
                                        {isSubmitting
                                            ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الإنشاء...</>
                                            : "إنشاء الكوبون"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Delete Confirm Modal ════════════════════════════════════════════ */}
            <AnimatePresence>
                {confirmDeleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.97, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.97, y: 12 }}
                            className="theme-surface-panel w-full max-w-sm rounded-[24px] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.2)]"
                        >
                            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-black text-theme">حذف كود الخصم</h3>
                            <p className="mt-2 text-sm leading-relaxed text-theme-soft">
                                سيتم حذف هذا الكوبون نهائياً ولن يقبله المتجر في الطلبات الجديدة.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 rounded-2xl border border-theme-subtle bg-theme-faint py-2.5 text-sm font-semibold text-theme-soft transition-colors hover:bg-theme-subtle disabled:opacity-40"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                                >
                                    {isDeleting
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحذف...</>
                                        : <><Trash2 className="h-4 w-4" /> حذف نهائياً</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
