"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ─── Remotion-Inspired Timing ─────────────────────────────
// spring configs adapted from Remotion best practices:
// smooth = damping: 200 (no bounce)
// snappy = damping: 20, stiffness: 200

const springSmooth = { type: "spring" as const, damping: 80, stiffness: 100 };
const springSnappy = { type: "spring" as const, damping: 20, stiffness: 200 };

// ─── Sequence Timings (seconds) ───────────────────────────
// Inspired by Remotion sequencing: each "scene" has a start time
const SEQUENCE = {
    ringOuter: 0.2,
    ringMiddle: 0.5,
    ringInner: 0.8,
    logoAppear: 1.0,
    logoGlow: 1.4,
    brandName: 1.8,
    calligraphy: 2.2,
    subtitle: 2.7,
    tagline: 3.1,
    fadeOut: 4.8,
    totalDuration: 5.6,
};

// ─── Component ────────────────────────────────────────────

interface WashaAiCinematicIntroProps {
    onComplete: () => void;
}

export function WashaAiCinematicIntro({ onComplete }: WashaAiCinematicIntroProps) {
    const [phase, setPhase] = useState<"playing" | "fading" | "done">("playing");

    const handleComplete = useCallback(() => {
        setPhase("fading");
        setTimeout(() => {
            setPhase("done");
            onComplete();
        }, 800);
    }, [onComplete]);

    useEffect(() => {
        const timer = setTimeout(handleComplete, SEQUENCE.totalDuration * 1000);
        return () => clearTimeout(timer);
    }, [handleComplete]);

    // Allow skip on click/tap
    const handleSkip = () => {
        if (phase === "playing") handleComplete();
    };

    if (phase === "done") return null;

    return (
        <AnimatePresence>
            <motion.div
                    key="cinematic-intro"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: phase === "fading" ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    onClick={handleSkip}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
                    style={{
                        background: "radial-gradient(ellipse at center, #0d0c0a 0%, #070605 40%, #000000 100%)",
                    }}
                >
                    {/* ══ Ambient Background Glow ══ */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 2, delay: 0.5 }}
                    >
                        {/* Central warm glow */}
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                            style={{
                                background: "radial-gradient(circle, rgba(201, 168, 106, 0.06) 0%, transparent 70%)",
                            }}
                        />
                        {/* Subtle noise */}
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
                            }}
                        />
                    </motion.div>

                    {/* ══ Concentric Rings — Remotion-style sequenced ══ */}
                    <div className="relative flex items-center justify-center mb-12">
                        
                        {/* Outer Ring */}
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                width: 280,
                                height: 280,
                                border: "1px solid rgba(201, 168, 106, 0.08)",
                            }}
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: 360 }}
                            transition={{
                                scale: { ...springSmooth, delay: SEQUENCE.ringOuter },
                                opacity: { duration: 0.8, delay: SEQUENCE.ringOuter },
                                rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                            }}
                        />

                        {/* Middle Ring */}
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                width: 220,
                                height: 220,
                                border: "1px solid rgba(201, 168, 106, 0.12)",
                            }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: -360 }}
                            transition={{
                                scale: { ...springSmooth, delay: SEQUENCE.ringMiddle },
                                opacity: { duration: 0.8, delay: SEQUENCE.ringMiddle },
                                rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                            }}
                        />

                        {/* Inner Ring */}
                        <motion.div
                            className="absolute rounded-full"
                            style={{
                                width: 160,
                                height: 160,
                                border: "1.5px solid rgba(201, 168, 106, 0.18)",
                                boxShadow: "0 0 30px rgba(201, 168, 106, 0.04)",
                            }}
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                ...springSmooth,
                                delay: SEQUENCE.ringInner,
                            }}
                        />

                        {/* Logo Container — Core Circle */}
                        <motion.div
                            className="relative z-10 flex items-center justify-center rounded-full"
                            style={{
                                width: 120,
                                height: 120,
                                background: "radial-gradient(circle, #1a1816 0%, #0e0d0b 60%, #080706 100%)",
                                border: "2px solid rgba(201, 168, 106, 0.15)",
                                boxShadow: `
                                    0 0 40px rgba(201, 168, 106, 0.08),
                                    0 0 80px rgba(201, 168, 106, 0.04),
                                    inset 0 2px 8px rgba(255, 255, 255, 0.03)
                                `,
                            }}
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                ...springSnappy,
                                delay: SEQUENCE.logoAppear,
                            }}
                        >
                            {/* Washa Circular Logo — same golden filters as washa.store */}
                            <motion.div
                                className="relative w-16 h-16"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 0.9, scale: 1 }}
                                transition={{ duration: 0.6, delay: SEQUENCE.logoAppear + 0.2 }}
                            >
                                <Image
                                    src="/hero-logo.png"
                                    alt="وشّى"
                                    fill
                                    className="object-contain brightness-0 invert sepia saturate-[2] hue-rotate-[5deg] opacity-90"
                                    priority
                                />
                            </motion.div>
                        </motion.div>

                        {/* Golden Glow Pulse behind logo */}
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                width: 180,
                                height: 180,
                                background: "radial-gradient(circle, rgba(201, 168, 106, 0.1) 0%, transparent 70%)",
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ 
                                opacity: [0, 0.6, 0.3, 0.6, 0.3],
                                scale: [0.8, 1.1, 1, 1.1, 1],
                            }}
                            transition={{ 
                                duration: 4, 
                                delay: SEQUENCE.logoGlow,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </div>

                    {/* ══ Text Sequence — Remotion-style staggered reveals ══ */}
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        
                        {/* "WASHA" — small tracking text */}
                        <motion.span
                            className="text-[13px] font-light tracking-[0.5em] uppercase"
                            style={{ color: "rgba(201, 168, 106, 0.5)" }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: SEQUENCE.brandName, ease: "easeOut" }}
                        >
                            WASHA
                        </motion.span>

                        {/* "وشّى" — Two layers matching washa.store hero exactly */}
                        <motion.div
                            className="relative w-72 h-32 mt-4"
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: SEQUENCE.calligraphy, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Layer 1: Golden logo via CSS filters */}
                            <Image
                                src="/HEDR_LOGO.png"
                                alt="وشّى"
                                fill
                                className="object-contain"
                                style={{
                                    filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(5deg)",
                                    opacity: 0.9,
                                }}
                                priority
                            />
                            {/* Layer 2: Shimmer masked to logo shape — only visible inside the letters */}
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    WebkitMaskImage: "url(/HEDR_LOGO.png)",
                                    maskImage: "url(/HEDR_LOGO.png)",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                }}
                            >
                                <motion.div
                                    className="absolute inset-0"
                                    style={{
                                        background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 44%, rgba(255,255,255,0.4) 46%, rgba(255,255,255,0.25) 48%, transparent 60%)",
                                    }}
                                    animate={{ x: ["-150%", "250%"] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5, delay: SEQUENCE.calligraphy + 1 }}
                                />
                            </motion.div>
                        </motion.div>

                        {/* "WASHA STUDIO" */}
                        <motion.span
                            className="text-[12px] font-light tracking-[0.4em] uppercase"
                            style={{ color: "rgba(201, 168, 106, 0.45)" }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: SEQUENCE.subtitle }}
                        >
                            WASHA STUDIO
                        </motion.span>

                        {/* Gold divider line */}
                        <motion.div
                            className="w-16 h-px mt-2 mb-2"
                            style={{
                                background: "linear-gradient(90deg, transparent, rgba(201, 168, 106, 0.4), transparent)",
                            }}
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ duration: 0.6, delay: SEQUENCE.subtitle + 0.2 }}
                        />

                        {/* Arabic tagline */}
                        <motion.span
                            className="text-[13px] font-light"
                            style={{ 
                                color: "rgba(201, 168, 106, 0.35)",
                                fontFamily: "var(--font-sans, 'Tajawal', system-ui, sans-serif)",
                            }}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: SEQUENCE.tagline }}
                        >
                            تهيئة بيئة التصميم الاحترافية
                        </motion.span>
                    </div>

                    {/* ══ Skip hint ══ */}
                    <motion.div
                        className="absolute bottom-8 left-1/2 -translate-x-1/2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ duration: 0.5, delay: 3.5 }}
                    >
                        <span className="text-[11px] text-white/20 tracking-widest uppercase">
                            اضغط للتخطي
                        </span>
                    </motion.div>
                </motion.div>
        </AnimatePresence>
    );
}
