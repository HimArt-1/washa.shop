"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CalendarDays,
    Send,
    CheckCircle,
    Loader2,
    Sparkles,
    ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const genderOptions = [
    { id: "male", label: "ذكر" },
    { id: "female", label: "أنثى" },
] as const;

const joinTypeOptions = [
    { id: "artist", label: "فنان" },
    { id: "designer", label: "مصمم" },
    { id: "model", label: "مودل" },
    { id: "customer", label: "عميل مهتم" },
    { id: "partner", label: "شريك أو متعاون" },
] as const;

const clothingOptionsByGender = {
    male: [
        { id: "thobe_shimagh", label: "ثوب وشماغ", emoji: "🥻" },
        { id: "tshirt", label: "تيشيرت", emoji: "👕" },
        { id: "hoodie", label: "هودي", emoji: "🧥" },
        { id: "plain_thobe", label: "ثوب سادة", emoji: "👔" },
    ],
    female: [
        { id: "abaya_shayla", label: "عباية وشيلة", emoji: "🖤" },
        { id: "blouse_skirt", label: "بلوزة وتنورة", emoji: "👚" },
        { id: "hoodie", label: "هودي", emoji: "🧥" },
        { id: "plain_abaya", label: "عباية سادة", emoji: "✨" },
    ],
} as const;

type JoinType = (typeof joinTypeOptions)[number]["id"] | "";
type Gender = (typeof genderOptions)[number]["id"] | "";

export default function JoinPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [joinType, setJoinType] = useState<JoinType>("");
    const [gender, setGender] = useState<Gender>("");
    const [birthDate, setBirthDate] = useState("");
    const [clothing, setClothing] = useState<string[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const clothingOptions = useMemo(
        () => (gender ? clothingOptionsByGender[gender] : []),
        [gender]
    );

    useEffect(() => {
        if (!gender) {
            setClothing([]);
            return;
        }

        const allowedIds = new Set<string>(clothingOptionsByGender[gender].map((option) => option.id));
        setClothing((prev) => prev.filter((item) => allowedIds.has(item)));
    }, [gender]);

    const toggleClothing = (id: string) => {
        setClothing((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;

        setStatus("loading");
        try {
            const { submitJoinForm } = await import("@/app/actions/join");
            const result = await submitJoinForm({
                name,
                email,
                phone,
                joinType,
                gender,
                birthDate,
                clothing,
            });
            if (result.success) {
                setStatus("success");
            } else {
                setStatus("error");
                setErrorMsg(result.message);
            }
        } catch {
            setStatus("error");
            setErrorMsg("حدث خطأ، حاول مرة أخرى");
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "var(--wusha-bg)" }} dir="rtl">
            {/* ─── Background Effects ─── */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Radial gold glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gold/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold/[0.02] rounded-full blur-[100px]" />
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `linear-gradient(color-mix(in srgb, var(--wusha-gold) 30%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--wusha-gold) 30%, transparent) 1px, transparent 1px)`,
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            {/* ─── Top Nav ─── */}
            <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-theme-subtle hover:text-theme-soft transition-colors group"
                >
                    <Image
                        src="/logo.png"
                        alt="وشّى"
                        width={40}
                        height={40}
                        className="opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                </Link>
                <Link
                    href="/"
                    className="flex items-center gap-1.5 text-sm text-theme-subtle hover:text-[var(--wusha-gold)] transition-colors"
                >
                    العودة للرئيسية
                    <ArrowLeft className="w-4 h-4" />
                </Link>
            </div>

            {/* ─── Main Content ─── */}
            <div className="relative z-10 flex items-center justify-center px-4 pb-16 pt-4 sm:pt-8">
                <div className="w-full max-w-lg">
                    <AnimatePresence mode="wait">
                        {status === "success" ? (
                            /* ═══ Success State ═══ */
                            <motion.div
                                key="success"
                                className="text-center py-20"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", damping: 20 }}
                            >
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.1, type: "spring", damping: 12 }}
                                >
                                    <CheckCircle className="w-24 h-24 text-gold mx-auto mb-6" />
                                </motion.div>
                                <motion.h2
                                    className="text-3xl font-bold mb-3"
                                    style={{ color: "var(--wusha-text)" }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    تم التسجيل بنجاح!
                                </motion.h2>
                                <motion.p
                                    className="text-theme-soft text-lg mb-8"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    شكراً لانضمامك إلى وشّى
                                    <br />
                                    سنتواصل معك قريباً
                                </motion.p>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <Link
                                        href="/"
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-gold/10 text-gold rounded-xl hover:bg-gold/20 transition-colors font-medium"
                                    >
                                        العودة للرئيسية
                                        <ArrowLeft className="w-4 h-4" />
                                    </Link>
                                </motion.div>
                            </motion.div>
                        ) : (
                            /* ═══ Form ═══ */
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {/* Header */}
                                <div className="text-center mb-10">
                                    <motion.div
                                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-bold mb-6"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        كن من أوائل المنضمين
                                    </motion.div>
                                    <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--wusha-text)" }}>
                                        كن جزءاً من{" "}
                                        <span className="text-gradient">وشّى</span>
                                    </h1>
                                    <p className="text-theme-subtle text-base sm:text-lg max-w-sm mx-auto">
                                        انضم إلى المجتمع وساعدنا نبني تجربة أدق للفئات التي تهم وشّى
                                    </p>
                                </div>

                                {/* Form Card */}
                                <div className="rounded-3xl p-6 sm:p-8 backdrop-blur-sm bg-theme-subtle border border-theme-soft">
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm text-theme-soft mb-2 font-medium">
                                                الاسم <span className="text-gold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="اسمك الكامل"
                                                className="input-dark w-full px-5 py-3.5 rounded-2xl text-base"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm text-theme-soft mb-2 font-medium">
                                                البريد الإلكتروني <span className="text-gold">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="example@email.com"
                                                dir="ltr"
                                                className="input-dark w-full px-5 py-3.5 rounded-2xl text-left text-base"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm text-theme-soft mb-2 font-medium">
                                                رقم الجوال
                                            </label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="05XXXXXXXX"
                                                dir="ltr"
                                                className="input-dark w-full px-5 py-3.5 rounded-2xl text-left text-base"
                                            />
                                        </div>

                                        {/* Join Type */}
                                        <div>
                                            <label className="block text-sm text-theme-soft mb-3 font-medium">
                                                ما نوع انضمامك إلى وشّى؟ <span className="text-gold">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {joinTypeOptions.map((option, i) => {
                                                    const isSelected = joinType === option.id;
                                                    return (
                                                        <motion.button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => setJoinType(option.id)}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.3 + i * 0.04 }}
                                                            className={`relative flex items-center justify-center rounded-2xl border px-4 py-4 text-sm font-medium transition-all duration-300 ${
                                                                isSelected
                                                                    ? "border-gold/40 bg-gold/[0.08] text-gold"
                                                                    : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-theme-strong hover:bg-theme-subtle"
                                                            }`}
                                                            style={isSelected ? { boxShadow: "0 0 20px color-mix(in srgb, var(--wusha-gold) 8%, transparent)" } : undefined}
                                                        >
                                                            {option.label}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Gender */}
                                        <div>
                                            <label className="block text-sm text-theme-soft mb-3 font-medium">
                                                وش جنسك؟ <span className="text-gold">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {genderOptions.map((option, i) => {
                                                    const isSelected = gender === option.id;
                                                    return (
                                                        <motion.button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => setGender(option.id as "male" | "female")}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.36 + i * 0.05 }}
                                                            className={`relative px-4 py-4 rounded-2xl border text-sm font-medium transition-all duration-300 flex items-center justify-center ${isSelected
                                                                    ? "border-gold/40 bg-gold/[0.08] text-gold"
                                                                    : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-theme-strong hover:bg-theme-subtle"
                                                                }`}
                                                            style={isSelected ? { boxShadow: "0 0 20px color-mix(in srgb, var(--wusha-gold) 8%, transparent)" } : undefined}
                                                        >
                                                            {option.label}
                                                            {isSelected && (
                                                                <motion.div
                                                                    className="absolute top-2 left-2 w-2 h-2 bg-gold rounded-full"
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{ type: "spring", damping: 15 }}
                                                                />
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Birth Date */}
                                        <div>
                                            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-theme-soft">
                                                <CalendarDays className="h-4 w-4 text-gold/70" />
                                                تاريخ الميلاد <span className="text-theme-muted">(اختياري)</span>
                                            </label>
                                            <div className="rounded-2xl border border-theme-soft bg-theme-subtle px-5 py-3.5 transition-colors focus-within:border-gold/40">
                                                <input
                                                    type="date"
                                                    value={birthDate}
                                                    onChange={(e) => setBirthDate(e.target.value)}
                                                    max={new Date().toISOString().split("T")[0]}
                                                    className="w-full bg-transparent text-sm text-theme outline-none [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                        {/* Clothing Preference */}
                                        <div>
                                            <label className="block text-sm text-theme-soft mb-3 font-medium">
                                                وش تحب تلبس؟
                                            </label>
                                            {gender ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs text-theme-faint">
                                                        <Sparkles className="h-3.5 w-3.5 text-gold/70" />
                                                        <span>تتبدل الخيارات تلقائيًا حسب الجنس المختار</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {clothingOptions.map((option, i) => {
                                                            const isSelected = clothing.includes(option.id);
                                                            return (
                                                                <motion.button
                                                                    key={option.id}
                                                                    type="button"
                                                                    onClick={() => toggleClothing(option.id)}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.4 + i * 0.05 }}
                                                                    className={`relative flex items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-medium transition-all duration-300 ${
                                                                        isSelected
                                                                            ? "border-gold/40 bg-gold/[0.08] text-gold"
                                                                            : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-theme-strong hover:bg-theme-subtle"
                                                                    }`}
                                                                    style={isSelected ? { boxShadow: "0 0 20px color-mix(in srgb, var(--wusha-gold) 8%, transparent)" } : undefined}
                                                                >
                                                                    <span className="text-lg">{option.emoji}</span>
                                                                    {option.label}
                                                                    {isSelected && (
                                                                        <motion.div
                                                                            className="absolute left-2 top-2 h-2 w-2 rounded-full bg-gold"
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ type: "spring", damping: 15 }}
                                                                        />
                                                                    )}
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-theme-soft bg-theme-subtle px-4 py-5 text-center text-sm text-theme-faint">
                                                    اختر الجنس أولًا لتظهر لك القطع المناسبة.
                                                </div>
                                            )}
                                        </div>

                                        {/* Error */}
                                        {status === "error" && (
                                            <motion.p
                                                className="text-red-400 text-sm text-center bg-red-400/10 rounded-xl py-3"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {errorMsg}
                                            </motion.p>
                                        )}

                                        {/* Submit */}
                                        <motion.button
                                            type="submit"
                                            disabled={status === "loading" || !name.trim() || !email.trim() || !joinType || !gender}
                                            className="w-full py-4 font-bold rounded-2xl transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-base"
                                            style={{
                                              background: "linear-gradient(to right, var(--wusha-gold), var(--wusha-gold-light))",
                                              color: "var(--wusha-bg)",
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!e.currentTarget.disabled) {
                                                e.currentTarget.style.boxShadow = "0 0 40px color-mix(in srgb, var(--wusha-gold) 20%, transparent)";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.boxShadow = "none";
                                            }}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    جاري الإرسال...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4.5 h-4.5" />
                                                    سجّل الآن
                                                </>
                                            )}
                                        </motion.button>
                                    </form>
                                </div>

                                {/* Footer note */}
                                <p className="text-center text-theme-muted text-xs mt-6">
                                    بياناتك محفوظة بأمان ولن نشاركها مع أي جهة
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
