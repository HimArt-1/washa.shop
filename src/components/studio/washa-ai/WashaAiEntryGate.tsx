"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Wand2, FileImage, Layers3, ArrowLeft } from "lucide-react";

// ─── Feature Data ─────────────────────────────────────────

const FEATURES = [
    {
        icon: Wand2,
        title: "توليد بالوصف",
        body: "اكتب فكرتك بالعربية أو الإنجليزية — يحوّلها الذكاء الاصطناعي إلى موكب جاهز على القطعة",
    },
    {
        icon: FileImage,
        title: "استخراج DTF",
        body: "يُخرج التصميم النقي بخلفية شفافة جاهزاً للطباعة المباشرة بجودة عالية",
    },
    {
        icon: Layers3,
        title: "أساليب احترافية",
        body: "أكثر من ١٠ أسلوب فني، تقنيات باليت، وقطع متعددة تنتج مخرجاً متسقاً في كل مرة",
    },
] as const;

// ─── Animation Variants ───────────────────────────────────

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

const fadeIn = (delay = 0) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, delay },
});

// ─── Component ────────────────────────────────────────────

export function WashaAiEntryGate({ redirectUrl }: { redirectUrl: string }) {
    const reducedMotion = useReducedMotion();

    const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`;
    const signInHref = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-[#030303] flex flex-col" dir="rtl">

            {/* ══ Background layers ══ */}
            <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>

                {/* Gradient orbs */}
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(206,174,127,0.10)_0%,transparent_70%)]" />
                <div className="absolute top-1/3 -left-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.07)_0%,transparent_70%)]" />
                <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.07)_0%,transparent_70%)]" />

                {/* Fine grid */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />

                {/* Horizontal scan line */}
                {!reducedMotion && (
                    <motion.div
                        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(206,174,127,0.25)] to-transparent"
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                    />
                )}
            </div>

            {/* ══ Top bar ══ */}
            <motion.header
                {...fadeIn(0.1)}
                className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10"
            >
                <Link href="/" className="text-[13px] font-medium text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    وشّى
                </Link>
                <div className="flex items-center gap-1.5 rounded-full border border-[rgba(206,174,127,0.2)] bg-[rgba(206,174,127,0.05)] px-3.5 py-1.5">
                    <Sparkles className="w-3 h-3 text-[#ceae7f]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#ceae7f]">WASHA AI</span>
                </div>
            </motion.header>

            {/* ══ Hero ══ */}
            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-8 pb-20 sm:px-10">

                {/* Animated rings */}
                <div className="relative mb-10 flex items-center justify-center">
                    {/* Outermost ring */}
                    {!reducedMotion && (
                        <motion.div
                            className="absolute h-[280px] w-[280px] rounded-full border border-[rgba(206,174,127,0.06)]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                        />
                    )}
                    {/* Mid ring with dashes */}
                    {!reducedMotion && (
                        <motion.div
                            className="absolute h-[210px] w-[210px] rounded-full border border-dashed border-[rgba(16,185,129,0.10)]"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                        />
                    )}
                    {/* Inner ring */}
                    {!reducedMotion && (
                        <motion.div
                            className="absolute h-[150px] w-[150px] rounded-full border border-[rgba(206,174,127,0.12)]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                        >
                            {/* Orbiting dot */}
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-[#ceae7f] shadow-[0_0_8px_rgba(206,174,127,0.8)]" />
                        </motion.div>
                    )}
                    {/* Core glow */}
                    <motion.div
                        {...(reducedMotion ? {} : {
                            animate: { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] },
                            transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                        })}
                        className="relative z-10 flex h-[90px] w-[90px] items-center justify-center rounded-2xl border border-[rgba(206,174,127,0.2)] bg-[rgba(206,174,127,0.05)] shadow-[0_0_60px_rgba(206,174,127,0.15)]"
                    >
                        <Sparkles className="h-9 w-9 text-[#ceae7f]" />
                    </motion.div>
                </div>

                {/* Headline */}
                <motion.div {...fadeUp(0.15)} className="text-center max-w-2xl">
                    <h1 className="text-[2.6rem] sm:text-[3.8rem] lg:text-[4.8rem] font-black leading-[1.1] tracking-tight">
                        <span
                            className="block bg-clip-text text-transparent"
                            style={{
                                backgroundImage: "linear-gradient(135deg, #ffffff 0%, #ceae7f 45%, #e0c99a 70%, #ceae7f 100%)",
                            }}
                        >
                            صمّم.
                        </span>
                        <span
                            className="block bg-clip-text text-transparent"
                            style={{
                                backgroundImage: "linear-gradient(135deg, #ceae7f 0%, #10b981 50%, #06b6d4 100%)",
                            }}
                        >
                            ارتدِ.
                        </span>
                        <span
                            className="block text-white/20 text-[0.55em] font-light tracking-[0.35em] uppercase mt-1"
                        >
                            Wearable Intelligence
                        </span>
                    </h1>
                </motion.div>

                {/* Sub copy */}
                <motion.p
                    {...fadeUp(0.3)}
                    className="mt-6 max-w-md text-center text-[15px] leading-[1.8] text-white/40"
                >
                    من الوصف إلى قطعة مطبوعة — يولّد WASHA AI موكب احترافي على ملابسك
                    ويُخرج ملف DTF جاهز للطباعة بلمسة واحدة.
                </motion.p>

                {/* CTA buttons */}
                <motion.div {...fadeUp(0.42)} className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                    <Link
                        href={signUpHref}
                        className="group relative w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-[15px] font-bold text-[#030303] overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                        style={{
                            background: "linear-gradient(135deg, #e0c99a 0%, #ceae7f 50%, #b8964f 100%)",
                            boxShadow: "0 0 0 1px rgba(206,174,127,0.3), 0 8px 32px rgba(206,174,127,0.25)",
                        }}
                    >
                        <motion.span
                            className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <Sparkles className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">ابدأ مجاناً</span>
                    </Link>

                    <Link
                        href={signInHref}
                        className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 px-8 py-4 text-[15px] font-medium text-white/60 transition-all duration-300 hover:border-white/20 hover:text-white/90 hover:bg-white/[0.03] active:scale-[0.98]"
                    >
                        <span>تسجيل الدخول</span>
                    </Link>
                </motion.div>

                {/* Feature cards */}
                <motion.div
                    {...fadeUp(0.55)}
                    className="mt-16 grid w-full max-w-3xl grid-cols-1 sm:grid-cols-3 gap-3"
                >
                    {FEATURES.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-right transition-all duration-300 hover:border-[rgba(206,174,127,0.15)] hover:bg-white/[0.04]"
                        >
                            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(206,174,127,0.15)] bg-[rgba(206,174,127,0.07)]">
                                <f.icon className="h-4 w-4 text-[#ceae7f]" />
                            </div>
                            <p className="mb-1.5 text-[13px] font-bold text-white/80">{f.title}</p>
                            <p className="text-[12px] leading-[1.7] text-white/35 group-hover:text-white/45 transition-colors">{f.body}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </main>

            {/* ══ Bottom bar ══ */}
            <motion.footer
                {...fadeIn(0.9)}
                className="relative z-10 flex items-center justify-center gap-4 px-6 pb-6 pt-2"
            >
                <span className="text-[11px] text-white/15 tracking-widest uppercase">Powered by Gemini AI</span>
                <span className="h-3 w-px bg-white/10" />
                <span className="text-[11px] text-white/15 tracking-widest uppercase">DTF Ready</span>
                <span className="h-3 w-px bg-white/10" />
                <span className="text-[11px] text-white/15 tracking-widest uppercase">وشّى © 2026</span>
            </motion.footer>
        </div>
    );
}
