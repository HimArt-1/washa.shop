"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CheckCircle, Loader2, Send, Sparkles, X } from "lucide-react";

interface JoinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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
        { id: "thobe_shimagh", label: "ثوب وشماغ" },
        { id: "tshirt", label: "تيشيرت" },
        { id: "hoodie", label: "هودي" },
        { id: "plain_thobe", label: "ثوب سادة" },
    ],
    female: [
        { id: "abaya_shayla", label: "عباية وشيلة" },
        { id: "blouse_skirt", label: "بلوزة وتنورة" },
        { id: "hoodie", label: "هودي" },
        { id: "plain_abaya", label: "عباية سادة" },
    ],
} as const;

type JoinType = (typeof joinTypeOptions)[number]["id"] | "";
type Gender = (typeof genderOptions)[number]["id"] | "";

export function JoinModal({ isOpen, onClose }: JoinModalProps) {
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
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !joinType || !gender) return;

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

    const handleClose = () => {
        if (status === "loading") return;

        onClose();
        setTimeout(() => {
            setName("");
            setEmail("");
            setPhone("");
            setJoinType("");
            setGender("");
            setBirthDate("");
            setClothing([]);
            setStatus("idle");
            setErrorMsg("");
        }, 300);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={handleClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gold/20 shadow-2xl shadow-gold/5"
                        style={{ backgroundColor: "var(--wusha-surface)" }}
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        dir="rtl"
                    >
                        <div className="h-1 bg-gradient-to-r from-gold/60 via-gold to-gold/60" />

                        <button
                            onClick={handleClose}
                            className="absolute left-4 top-4 z-10 rounded-full p-1.5 transition-colors hover:bg-theme-subtle"
                        >
                            <X className="h-5 w-5 text-theme-subtle" />
                        </button>

                        <div className="p-6 sm:p-8">
                            {status === "success" ? (
                                <motion.div
                                    className="py-8 text-center"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", damping: 20 }}
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.1, type: "spring", damping: 15 }}
                                    >
                                        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-gold" />
                                    </motion.div>
                                    <h3 className="mb-2 text-xl font-bold" style={{ color: "var(--wusha-text)" }}>
                                        تم التسجيل بنجاح!
                                    </h3>
                                    <p className="text-sm text-theme-soft">شكراً لانضمامك، سنتواصل معك قريباً</p>
                                    <button
                                        onClick={handleClose}
                                        className="mt-6 rounded-lg bg-gold/10 px-6 py-2 text-sm text-gold transition-colors hover:bg-gold/20"
                                    >
                                        إغلاق
                                    </button>
                                </motion.div>
                            ) : (
                                <>
                                    <h2 className="mb-1 text-xl font-bold sm:text-2xl" style={{ color: "var(--wusha-text)" }}>
                                        كن جزءاً من وشّى
                                    </h2>
                                    <p className="mb-6 text-sm text-theme-subtle">
                                        انضم إلى المجتمع وساعدنا نبني تجربة أوضح وأذكى للمستقبل
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="mb-1.5 block text-sm text-theme-soft">
                                                الاسم <span className="text-gold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="اسمك الكامل"
                                                className="input-dark w-full rounded-xl px-4 py-3 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm text-theme-soft">
                                                البريد الإلكتروني <span className="text-gold">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="example@email.com"
                                                dir="ltr"
                                                className="input-dark w-full rounded-xl px-4 py-3 text-left"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm text-theme-soft">رقم الجوال</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="05XXXXXXXX"
                                                dir="ltr"
                                                className="input-dark w-full rounded-xl px-4 py-3 text-left"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2.5 block text-sm text-theme-soft">
                                                ما نوع انضمامك إلى وشّى؟ <span className="text-gold">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {joinTypeOptions.map((option) => {
                                                    const isSelected = joinType === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => setJoinType(option.id)}
                                                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                                                isSelected
                                                                    ? "border-gold/50 bg-gold/10 text-gold shadow-[0_0_12px_rgba(206,174,127,0.1)]"
                                                                    : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-theme-strong hover:bg-theme-subtle-hover"
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2.5 block text-sm text-theme-soft">
                                                وش جنسك؟ <span className="text-gold">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {genderOptions.map((option) => {
                                                    const isSelected = gender === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => setGender(option.id)}
                                                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                                                isSelected
                                                                    ? "border-gold/50 bg-gold/10 text-gold shadow-[0_0_12px_rgba(206,174,127,0.1)]"
                                                                    : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-theme-strong hover:bg-theme-subtle-hover"
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2.5 flex items-center gap-2 text-sm text-theme-soft">
                                                <CalendarDays className="h-4 w-4 text-gold/70" />
                                                تاريخ الميلاد <span className="text-theme-muted">(اختياري)</span>
                                            </label>
                                            <div className="rounded-2xl border border-theme-soft bg-theme-subtle px-4 py-3 transition-colors focus-within:border-gold/40">
                                                <input
                                                    type="date"
                                                    value={birthDate}
                                                    onChange={(e) => setBirthDate(e.target.value)}
                                                    max={new Date().toISOString().split("T")[0]}
                                                    className="w-full bg-transparent text-sm text-theme outline-none [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2.5 block text-sm text-theme-soft">
                                                وش تحب تلبس؟ <span className="text-theme-muted">(اختياري)</span>
                                            </label>

                                            {gender ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[11px] text-theme-faint">
                                                        <Sparkles className="h-3.5 w-3.5 text-gold/70" />
                                                        <span>تم تخصيص الخيارات حسب الجنس المختار</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {clothingOptions.map((option) => {
                                                            const isSelected = clothing.includes(option.id);
                                                            return (
                                                                <button
                                                                    key={option.id}
                                                                    type="button"
                                                                    onClick={() => toggleClothing(option.id)}
                                                                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                                                        isSelected
                                                                            ? "border-gold/50 bg-gold/10 text-gold shadow-[0_0_12px_rgba(206,174,127,0.1)]"
                                                                            : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-theme-strong hover:bg-theme-subtle-hover"
                                                                    }`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-theme-soft bg-theme-subtle px-4 py-4 text-center text-sm text-theme-faint">
                                                    حدّد الجنس أولًا لتظهر خيارات الملابس المناسبة.
                                                </div>
                                            )}
                                        </div>

                                        {status === "error" && (
                                            <motion.p
                                                className="rounded-lg bg-red-400/10 py-2 text-center text-sm text-red-400"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {errorMsg}
                                            </motion.p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={status === "loading" || !name.trim() || !email.trim() || !joinType || !gender}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{
                                                background: "linear-gradient(to right, var(--wusha-gold), var(--wusha-gold-light))",
                                                color: "var(--wusha-bg)",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!e.currentTarget.disabled) {
                                                    e.currentTarget.style.boxShadow = "0 0 30px var(--neon-gold)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    جاري الإرسال...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" />
                                                    سجّل الآن
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
