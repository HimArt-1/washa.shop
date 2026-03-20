"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Tag, Percent, Copy, Check, Trash2, Power, Zap } from "lucide-react";
import { createDiscountCoupon, deleteDiscountCoupon, toggleCouponStatus } from "@/app/actions/discount-coupons";
import type { Database } from "@/types/database";

type Coupon = Database["public"]["Tables"]["discount_coupons"]["Row"];

export function CouponsClient({ initialCoupons }: { initialCoupons: Coupon[] }) {
    const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");
    const [copiedCode, setCopiedCode] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form state
    const [code, setCode] = useState("");
    const [type, setType] = useState<"percentage" | "fixed">("percentage");
    const [value, setValue] = useState("");
    const [maxUses, setMaxUses] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [details, setDetails] = useState("");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const result = await createDiscountCoupon({
                code,
                discount_type: type,
                discount_value: Number(value),
                max_uses: maxUses ? Number(maxUses) : 0,
                valid_until: validUntil ? new Date(validUntil).toISOString() : null,
                details: details || null,
                is_active: true
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.data) {
                setCoupons([result.data as Coupon, ...coupons]);
                setIsCreating(false);
                // Reset form
                setCode("");
                setValue("");
                setMaxUses("");
                setValidUntil("");
                setDetails("");
            }
        } catch (err: any) {
            setError(err.message || "حدث خطأ غير متوقع");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const result = await toggleCouponStatus(id, currentStatus);
        if (result.success) {
            setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
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
            setCoupons(coupons.filter(c => c.id !== targetId));
            return;
        }
        setError(result.error || "تعذر حذف كود الخصم الآن.");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(""), 2000);
    };

    return (
        <div className="space-y-6">
            {error && !isCreating && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-theme-strong">كوبونات الخصم</h1>
                    <p className="text-theme-subtle text-sm mt-1">أدِر حملاتك التسويقية وأكواد الخصم بسهولة</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold hover:bg-gold hover:text-[var(--wusha-bg)] border border-gold/20 rounded-xl font-bold transition-all"
                >
                    <Plus className="w-5 h-5" />
                    كوبون جديد
                </button>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="theme-surface-panel p-6 rounded-[1.75rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                        >
                            <div className="mb-6">
                                <p className="text-xs uppercase tracking-[0.3em] text-theme-faint mb-2">Discount Campaign</p>
                                <h2 className="text-xl font-bold text-theme">إنشاء كود خصم جديد</h2>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm mb-6">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-theme-soft mb-1">كود الخصم (مثال: WASHA20)</label>
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="input-dark w-full rounded-xl px-4 py-2.5 uppercase"
                                        placeholder="CODE2024"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-theme-soft mb-1">نوع الخصم</label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value as any)}
                                            className="input-dark w-full rounded-xl px-4 py-2.5"
                                        >
                                            <option value="percentage">نسبة مئوية (%)</option>
                                            <option value="fixed">مبلغ ثابت (SAR)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-theme-soft mb-1">
                                            {type === 'percentage' ? 'النسبة (%)' : 'المبلغ (SAR)'}
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0.1"
                                            step={type === 'percentage' ? "1" : "0.01"}
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            className="input-dark w-full rounded-xl px-4 py-2.5"
                                            placeholder="20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-theme-soft mb-1">الحد الأقصى للاستخدام</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={maxUses}
                                            onChange={(e) => setMaxUses(e.target.value)}
                                            className="input-dark w-full rounded-xl px-4 py-2.5"
                                            placeholder="أتركه فارغاً للامحدود"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-theme-soft mb-1">تاريخ الانتهاء</label>
                                        <input
                                            type="datetime-local"
                                            value={validUntil}
                                            onChange={(e) => setValidUntil(e.target.value)}
                                            className="input-dark w-full rounded-xl px-4 py-2.5"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-theme-soft mb-1">تفاصيل وملاحظات (اختياري)</label>
                                    <input
                                        type="text"
                                        value={details}
                                        onChange={(e) => setDetails(e.target.value)}
                                        className="input-dark w-full rounded-xl px-4 py-2.5"
                                        placeholder="مثال: خصم بمناسبة اليوم الوطني"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-2.5 rounded-xl font-bold text-theme-soft bg-theme-faint hover:bg-theme-subtle border border-theme-subtle transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-2.5 bg-gold text-[var(--wusha-bg)] rounded-xl font-bold hover:bg-gold-light transition-colors disabled:opacity-50 shadow-[0_16px_36px_rgba(154,123,61,0.2)]"
                                    >
                                        {isSubmitting ? "جاري الإنشاء..." : "إنشاء الكوبون"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Coupons List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => {
                    const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                    const isExhausted = coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses;
                    const isValid = coupon.is_active && !isExpired && !isExhausted;

                    return (
                        <motion.div
                            key={coupon.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`relative p-6 rounded-[1.75rem] border backdrop-blur-md transition-all ${isValid
                                ? "theme-surface-panel hover:border-gold/40"
                                : "bg-red-500/6 border-red-500/20 opacity-80"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${isValid ? "bg-gold/10 text-gold" : "bg-theme-subtle text-theme-subtle"}`}>
                                        {coupon.discount_type === 'percentage' ? <Percent className="w-6 h-6" /> : <Tag className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-black text-theme">{coupon.code}</h3>
                                            <button
                                                onClick={() => copyToClipboard(coupon.code)}
                                                className="text-theme-subtle hover:text-gold transition-colors"
                                            >
                                                {copiedCode === coupon.code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-theme-soft font-medium tracking-wide">
                                            {coupon.discount_type === 'percentage'
                                                ? `خصم ${coupon.discount_value}%`
                                                : `خصم ${coupon.discount_value} ر.س`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-theme-subtle">الاستخدام</span>
                                    <span className="text-theme font-mono">
                                        {coupon.current_uses} / {coupon.max_uses === 0 ? "∞" : coupon.max_uses}
                                    </span>
                                </div>
                                {coupon.valid_until && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-theme-subtle">صالح حتى</span>
                                        <span className={`font-mono ${isExpired ? "text-red-400" : "text-theme"}`}>
                                            {new Date(coupon.valid_until).toLocaleDateString('ar-SA')}
                                        </span>
                                    </div>
                                )}
                                {coupon.details && (
                                    <p className="text-theme-subtle text-xs mt-2 line-clamp-2">{coupon.details}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 border-t border-theme-faint pt-4">
                                <button
                                    onClick={() => handleToggle(coupon.id, coupon.is_active)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${coupon.is_active
                                        ? "bg-theme-faint border border-theme-subtle text-theme-soft hover:bg-theme-subtle"
                                        : "bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20"
                                        }`}
                                >
                                    {coupon.is_active ? <Power className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                    {coupon.is_active ? "إيقاف" : "تفعيل"}
                                </button>
                                <button
                                    onClick={() => {
                                        setError("");
                                        setConfirmDeleteId(coupon.id);
                                    }}
                                    className="p-2 bg-theme-faint border border-theme-subtle text-theme-subtle hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {coupons.length === 0 && (
                <div className="text-center py-20 border border-dashed border-theme-soft rounded-3xl">
                    <Tag className="w-12 h-12 text-theme-faint mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-theme mb-2">لا يوجد كوبونات</h3>
                    <p className="text-theme-subtle">لم تقم بإنشاء أي أكواد خصم بعد.</p>
                </div>
            )}

            <AnimatePresence>
                {confirmDeleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 16 }}
                            className="theme-surface-panel w-full max-w-sm rounded-[1.5rem] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                        >
                            <p className="text-xs uppercase tracking-[0.24em] text-theme-faint">Delete Coupon</p>
                            <h3 className="mt-2 text-lg font-bold text-theme">حذف كود الخصم</h3>
                            <p className="mt-3 text-sm leading-relaxed text-theme-subtle">
                                سيتم حذف هذا الكوبون نهائيًا من القائمة الحالية.
                            </p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:opacity-40"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                                >
                                    {isDeleting ? <Check className="w-4 h-4 animate-pulse" /> : <Trash2 className="w-4 h-4" />}
                                    حذف الكوبون
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
