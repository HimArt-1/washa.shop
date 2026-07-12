"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

// ─── WASHA AI · Cinematic Boot ────────────────────────────
// A "neural engine initializing" sequence: a live node network
// converges behind the mark while a technical boot log streams,
// then the studio door opens on an explicit user action.
//
// Palette is locked to the brand's dark-theme gold so the intro
// reads as one system with the rest of وشّى.

const GOLD = "206, 174, 127"; // --wusha-gold (dark) → rgb
const BOOT_MS = 2000;
const springSnappy = { type: "spring" as const, damping: 20, stiffness: 220 };

// Each boot stage unlocks at a fraction of total progress.
const STEPS = [
    { at: 0.0, ar: "تهيئة المحرّك العصبي", en: "NEURAL ENGINE" },
    { at: 0.26, ar: "تحميل نماذج التوليد", en: "DIFFUSION MODELS" },
    { at: 0.55, ar: "معايرة فضاء التصميم", en: "LATENT DESIGN SPACE" },
    { at: 0.82, ar: "تجهيز بيئة الاستوديو", en: "STUDIO RUNTIME" },
] as const;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Phase = "booting" | "ready" | "exiting";

interface WashaAiCinematicIntroProps {
    onComplete: () => void;
}

// ─── Neural node field (isolated perpetual animation) ─────
const NeuralField = memo(function NeuralField() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let raf = 0;
        let w = 0;
        let h = 0;

        const NODE_COUNT = 48;
        const LINK_DIST = 140;
        const nodes: { x: number; y: number; vx: number; vy: number; p: number }[] = [];

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.16,
                vy: (Math.random() - 0.5) * 0.16,
                p: Math.random() * Math.PI * 2,
            });
        }

        const draw = (loop: boolean) => {
            ctx.clearRect(0, 0, w, h);
            const now = performance.now() / 1000;

            for (const n of nodes) {
                if (loop) {
                    n.x += n.vx;
                    n.y += n.vy;
                    if (n.x < 0 || n.x > w) n.vx *= -1;
                    if (n.y < 0 || n.y > h) n.vy *= -1;
                }
            }

            // Links — brighter the closer two nodes are.
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d = Math.hypot(dx, dy);
                    if (d < LINK_DIST) {
                        const o = (1 - d / LINK_DIST) * 0.16;
                        ctx.strokeStyle = `rgba(${GOLD}, ${o})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // Nodes — a slow synaptic pulse in brightness.
            for (const n of nodes) {
                const pulse = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(now * 1.2 + n.p));
                ctx.fillStyle = `rgba(${GOLD}, ${pulse})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, 1.15, 0, Math.PI * 2);
                ctx.fill();
            }

            if (loop) raf = requestAnimationFrame(() => draw(true));
        };

        draw(!reduce);
        window.addEventListener("resize", resize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
});

// ─── Decoding text (technical flavour) ────────────────────
const GLYPHS = "01/<>#*»«ـ+=".split("");

function ScrambleText({
    text,
    className,
    style,
    delay = 0,
    speed = 34,
}: {
    text: string;
    className?: string;
    style?: React.CSSProperties;
    delay?: number;
    speed?: number;
}) {
    const [out, setOut] = useState("");
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        if (reduceMotion) {
            setOut(text);
            return;
        }

        let frame = 0;
        let tick: ReturnType<typeof setTimeout>;
        const run = () => {
            const revealed = Math.floor(frame / 2);
            let s = "";
            for (let i = 0; i < text.length; i++) {
                if (i < revealed || text[i] === " ") s += text[i];
                else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
            setOut(s);
            frame++;
            if (revealed <= text.length) tick = setTimeout(run, speed);
            else setOut(text);
        };
        const start = setTimeout(run, delay);
        return () => {
            clearTimeout(start);
            clearTimeout(tick);
        };
    }, [text, delay, speed, reduceMotion]);

    return (
        <span className={className} style={style}>
            {out || " "}
        </span>
    );
}

// ─── Component ────────────────────────────────────────────
export function WashaAiCinematicIntro({ onComplete }: WashaAiCinematicIntroProps) {
    const [phase, setPhase] = useState<Phase>("booting");
    const [progress, setProgress] = useState(0);
    const reduceMotion = useReducedMotion();

    // Drive the boot progress on a single rAF loop.
    useEffect(() => {
        if (phase !== "booting") return;
        if (reduceMotion) {
            setProgress(100);
            setPhase("ready");
            return;
        }
        let raf = 0;
        const start = performance.now();
        const tick = (t: number) => {
            const e = Math.min(1, (t - start) / BOOT_MS);
            setProgress(Math.round(easeOutCubic(e) * 100));
            if (e < 1) raf = requestAnimationFrame(tick);
            else setPhase("ready");
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [phase, reduceMotion]);

    const enter = useCallback(() => {
        setPhase("exiting");
        window.setTimeout(onComplete, reduceMotion ? 0 : 520);
    }, [onComplete, reduceMotion]);

    const skip = useCallback(() => {
        if (phase === "booting") {
            setProgress(100);
            enter();
        }
    }, [enter, phase]);

    // Progress ring geometry.
    const R = 70;
    const C = 2 * Math.PI * R;
    const p = progress / 100;

    return (
        <MotionConfig reducedMotion="user">
            <AnimatePresence>
                <motion.div
                key="washa-ai-boot"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "exiting" ? 0 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                dir="rtl"
                className="fixed inset-0 z-[9999] flex min-h-[100dvh] select-none flex-col items-center justify-center overflow-hidden"
                style={{
                    background:
                        "radial-gradient(ellipse at 50% 42%, #14110d 0%, #0c0a08 46%, #060504 100%)",
                }}
            >
                {/* Live neural background */}
                <div className="absolute inset-0 opacity-70">
                    <NeuralField />
                </div>

                {/* Center vignette keeps the mark legible over the field */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(circle at 50% 42%, rgba(6,5,4,0.86) 0%, rgba(6,5,4,0.4) 26%, transparent 52%)",
                    }}
                />
                {/* Fine grain */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                />

                {/* ══ HUD frame ══ */}
                <HudCorners />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 sm:px-8">
                    <ScrambleText
                        text="WASHA://AI.ENGINE"
                        className="font-mono text-[10px] tracking-[0.32em]"
                        style={{ color: `rgba(${GOLD}, 0.55)` }}
                        delay={200}
                    />
                    <span
                        className="font-mono text-[10px] tracking-[0.32em]"
                        style={{ color: `rgba(${GOLD}, 0.4)` }}
                    >
                        BUILD 7.07
                    </span>
                </div>

                {/* ══ Mark + progress ring ══ */}
                <div className="relative z-10 mb-9 flex items-center justify-center">
                    {/* Rotating tick ring */}
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: 232,
                            height: 232,
                            border: `1px dashed rgba(${GOLD}, 0.1)`,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Progress ring */}
                    <svg width={184} height={184} viewBox="0 0 184 184" className="absolute -rotate-90">
                        <circle cx="92" cy="92" r={R} fill="none" stroke={`rgba(${GOLD}, 0.09)`} strokeWidth={1.5} />
                        <circle
                            cx="92"
                            cy="92"
                            r={R}
                            fill="none"
                            stroke={`rgba(${GOLD}, 0.85)`}
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeDasharray={C}
                            strokeDashoffset={C * (1 - p)}
                            style={{ transition: "stroke-dashoffset 120ms linear", filter: `drop-shadow(0 0 6px rgba(${GOLD}, 0.35))` }}
                        />
                    </svg>

                    {/* Logo core */}
                    <motion.div
                        className="relative z-10 flex items-center justify-center rounded-full"
                        style={{
                            width: 116,
                            height: 116,
                            background: "radial-gradient(circle, #1b1815 0%, #0e0c0a 62%, #080605 100%)",
                            border: `1px solid rgba(${GOLD}, 0.2)`,
                            boxShadow: `inset 0 1px 6px rgba(255,255,255,0.04), 0 0 46px rgba(${GOLD}, 0.07)`,
                        }}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ ...springSnappy, delay: 0.2 }}
                    >
                        <motion.div
                            className="relative flex h-14 w-14 items-center justify-center"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 0.95, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            {/* Current brand mark — crisp gold fill via mask, matching the header */}
                            <span
                                role="img"
                                aria-label="وشّى"
                                className="block h-full w-full"
                                style={{
                                    backgroundColor: `rgb(${GOLD})`,
                                    WebkitMaskImage: "url(/header-logo-identity.png)",
                                    maskImage: "url(/header-logo-identity.png)",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    filter: `drop-shadow(0 0 6px rgba(${GOLD}, 0.3))`,
                                }}
                            />
                        </motion.div>
                    </motion.div>
                </div>

                {/* ══ Wordmark ══ */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <ScrambleText
                        text="W A S H A   ·   A I"
                        className="font-mono text-[12px] font-light tracking-[0.42em]"
                        style={{ color: `rgba(${GOLD}, 0.62)` }}
                        delay={700}
                        speed={40}
                    />

                    <motion.div
                        className="relative mt-1 h-24 w-60"
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <Image
                            src="/HEDR_LOGO.png"
                            alt="وشّى"
                            fill
                            sizes="240px"
                            className="object-contain"
                            style={{ filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(5deg)", opacity: 0.92 }}
                            priority
                        />
                        {/* Shimmer masked to the letterforms */}
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
                                    background:
                                        "linear-gradient(110deg, transparent 32%, rgba(255,255,255,0.28) 46%, transparent 60%)",
                                }}
                                animate={{ x: ["-160%", "260%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.4, delay: 2 }}
                            />
                        </motion.div>
                    </motion.div>

                    <motion.span
                        className="text-[13px] font-light"
                        style={{ color: `rgba(${GOLD}, 0.42)`, fontFamily: "var(--font-arabic, system-ui, sans-serif)" }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.4 }}
                    >
                        نظام التصميم الذكي
                    </motion.span>
                    <motion.p
                        className="max-w-[310px] text-center text-[14px] leading-7 sm:max-w-[380px] sm:text-[15px]"
                        style={{ color: `rgba(${GOLD}, 0.72)`, fontFamily: "var(--font-arabic, system-ui, sans-serif)" }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: reduceMotion ? 0 : 1.55 }}
                    >
                        حوّل فكرتك إلى تصميم جاهز للطباعة على قطعتك خلال دقائق.
                    </motion.p>
                </div>

                {/* ══ Boot log + progress / enter ══ */}
                <div className="relative z-10 mt-11 flex w-[300px] max-w-[86vw] flex-col gap-3 sm:w-[360px]">
                    <AnimatePresence mode="wait">
                        {phase === "ready" ? (
                            <motion.div
                                key="enter"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={springSnappy}
                                className="flex flex-col items-center gap-4"
                            >
                                <div className="flex items-center gap-2">
                                    <StatusDot done />
                                    <span
                                        className="font-mono text-[11px] tracking-[0.24em]"
                                        style={{ color: `rgba(${GOLD}, 0.7)` }}
                                    >
                                        SYSTEM READY · النظام جاهز
                                    </span>
                                </div>
                                <motion.button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        enter();
                                    }}
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="group flex items-center gap-3 rounded-full px-7 py-3 text-[14px] font-medium"
                                    style={{
                                        color: "#0c0a08",
                                        background: `linear-gradient(180deg, rgba(${GOLD}, 1), rgba(${GOLD}, 0.82))`,
                                        boxShadow: `0 10px 34px rgba(${GOLD}, 0.24), inset 0 1px 0 rgba(255,255,255,0.35)`,
                                        fontFamily: "var(--font-arabic, system-ui, sans-serif)",
                                    }}
                                >
                                    ادخل إلى الاستوديو
                                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={2} />
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="log"
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-2"
                            >
                                {STEPS.map((s, i) => {
                                    const next = STEPS[i + 1]?.at ?? 1.001;
                                    if (p < s.at - 0.001) return null;
                                    const done = p >= next;
                                    return (
                                        <motion.div
                                            key={s.en}
                                            initial={{ opacity: 0, x: 8 }}
                                            animate={{ opacity: done ? 0.55 : 1, x: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="flex items-center gap-2.5"
                                        >
                                            <StatusDot done={done} />
                                            <span
                                                className="text-[12px]"
                                                style={{ color: `rgba(${GOLD}, ${done ? 0.5 : 0.82})`, fontFamily: "var(--font-arabic, system-ui, sans-serif)" }}
                                            >
                                                {s.ar}
                                            </span>
                                            <span
                                                className="mr-auto font-mono text-[9px] tracking-[0.2em]"
                                                style={{ color: `rgba(${GOLD}, 0.32)` }}
                                            >
                                                {s.en}
                                            </span>
                                        </motion.div>
                                    );
                                })}

                                {/* Progress bar */}
                                <div className="mt-2 flex items-center gap-3">
                                    <div
                                        className="relative h-[3px] flex-1 overflow-hidden rounded-full"
                                        style={{ background: `rgba(${GOLD}, 0.1)` }}
                                    >
                                        <div
                                            className="absolute inset-y-0 right-0 rounded-full"
                                            style={{
                                                width: `${progress}%`,
                                                background: `linear-gradient(90deg, rgba(${GOLD}, 0.3), rgba(${GOLD}, 0.95))`,
                                                boxShadow: `0 0 10px rgba(${GOLD}, 0.4)`,
                                                transition: "width 120ms linear",
                                            }}
                                        />
                                    </div>
                                    <span
                                        className="w-9 text-right font-mono text-[11px] tabular-nums"
                                        style={{ color: `rgba(${GOLD}, 0.7)` }}
                                    >
                                        {progress}%
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ══ Skip hint ══ */}
                <AnimatePresence>
                    {phase === "booting" && (
                        <motion.button
                            type="button"
                            onClick={skip}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.72 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, delay: 0.7 }}
                            className="absolute bottom-7 left-1/2 -translate-x-1/2 rounded-full border border-white/15 px-4 py-2 text-[12px] tracking-wide text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            style={{ fontFamily: "var(--font-arabic, system-ui, sans-serif)" }}
                        >
                            تخطي المقدمة
                        </motion.button>
                    )}
                </AnimatePresence>
                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
}

// ─── Small parts ──────────────────────────────────────────
function StatusDot({ done }: { done?: boolean }) {
    const reduceMotion = useReducedMotion();
    if (done) {
        return (
            <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke={`rgba(${GOLD}, 0.85)`} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <motion.span
            className="block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: `rgba(${GOLD}, 0.9)` }}
            animate={reduceMotion ? undefined : { opacity: [1, 0.25, 1], scale: [1, 0.7, 1] }}
            transition={reduceMotion ? undefined : { duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

function HudCorners() {
    const base = "pointer-events-none absolute h-5 w-5";
    const line = `rgba(${GOLD}, 0.28)`;
    return (
        <>
            <span className={`${base} left-5 top-5 border-l border-t sm:left-8 sm:top-8`} style={{ borderColor: line }} />
            <span className={`${base} right-5 top-5 border-r border-t sm:right-8 sm:top-8`} style={{ borderColor: line }} />
            <span className={`${base} bottom-5 left-5 border-b border-l sm:bottom-8 sm:left-8`} style={{ borderColor: line }} />
            <span className={`${base} bottom-5 right-5 border-b border-r sm:bottom-8 sm:right-8`} style={{ borderColor: line }} />
        </>
    );
}
