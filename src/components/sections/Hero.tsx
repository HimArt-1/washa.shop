"use client";

import { useRef, useState, useEffect, useCallback, type CSSProperties } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Sparkles, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JoinModal } from "@/components/ui/JoinModal";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { WushaShaderBackground } from "@/components/sections/WushaShaderBackground";

interface HeroProps {
  backgroundMode?: "shader" | "video";
  showAuthButtons?: boolean;
  showWashaAiButton?: boolean;
  showJoinArtistButton?: boolean;
}

const HERO_LOGO_SRC = "/hero-logo-cinematic.png";
const HERO_LOGO_ASPECT = "aspect-[2171/1468]";
const HERO_LOGO_TONE = "var(--hero-logo-tone)";
const INTRO_LOGO_SRC = "/header-logo-identity.png";
const INTRO_LOGO_ASPECT = "aspect-[1017/888]";
const INTRO_MIN_VISIBLE_MS = 1700;
const INTRO_READY_HOLD_MS = 760;
const INTRO_LOGO_ENTER_DURATION = 1.15;
const INTRO_LOGO_EXIT_DURATION = 1.6;
const INTRO_CURTAIN_EXIT_DURATION = 0.85;
const INTRO_EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const INTRO_EASE_IN_OUT: [number, number, number, number] = [0.42, 0, 0.58, 1];

const createLogoMask = (src: string, backgroundColor: string, filter?: string): CSSProperties => ({
  backgroundColor,
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  filter,
});

const createHeroLogoMask = (backgroundColor: string, filter?: string): CSSProperties =>
  createLogoMask(HERO_LOGO_SRC, backgroundColor, filter);

const createIntroLogoMask = (backgroundColor: string, filter?: string): CSSProperties =>
  createLogoMask(INTRO_LOGO_SRC, backgroundColor, filter);

export function Hero({
  backgroundMode = "shader",
  showAuthButtons = true,
  showWashaAiButton = true,
  showJoinArtistButton = false,
}: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [introMinimumElapsed, setIntroMinimumElapsed] = useState(false);
  const [introExiting, setIntroExiting] = useState(false);
  const [curtainLifted, setCurtainLifted] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const router = useRouter();

  // ─── تسجيل دخول سري للأدمن: نقرة على الشعار → تسجيل دخول ثم لوحة الإدارة ───
  const handleAdminSignIn = useCallback(() => {
    router.push("/sign-in?redirect_url=/dashboard");
  }, [router]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  const handleBackgroundReady = useCallback(() => {
    setBackgroundReady(true);
  }, []);

  useEffect(() => {
    if (backgroundMode !== "video") return;

    const video = videoRef.current;
    if (!video) return;

    const onCanPlay = () => setBackgroundReady(true);

    if (video.readyState >= 3) {
      setBackgroundReady(true);
    } else {
      video.addEventListener("canplay", onCanPlay);
    }

    return () => {
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [backgroundMode]);

  // Safety timeout: the entrance should not block if WebGL/video initialization is delayed.
  useEffect(() => {
    const fallbackMs = backgroundMode === "video" ? 4000 : 2500;
    const fallback = setTimeout(() => setBackgroundReady(true), fallbackMs);
    return () => clearTimeout(fallback);
  }, [backgroundMode]);

  useEffect(() => {
    const timer = setTimeout(() => setIntroMinimumElapsed(true), INTRO_MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Keep the intro visible long enough to feel intentional, even when WebGL is ready immediately.
  useEffect(() => {
    if (!backgroundReady || !introMinimumElapsed) return;
    const exitTimer = setTimeout(() => setIntroExiting(true), INTRO_READY_HOLD_MS);
    const liftTimer = setTimeout(
      () => setCurtainLifted(true),
      INTRO_READY_HOLD_MS + INTRO_LOGO_EXIT_DURATION * 1000,
    );

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(liftTimer);
    };
  }, [backgroundReady, introMinimumElapsed]);

  const heroTokens = {
    subtitle: "rgba(224, 201, 154, 0.94)",
    secondaryBorder: "rgba(250, 243, 230, 0.28)",
    secondaryBg: "rgba(250, 243, 230, 0.08)",
    secondaryText: "rgba(250, 243, 230, 0.92)",
    secondaryBorderHover: "rgba(224, 201, 154, 0.42)",
    secondaryBgHover: "rgba(250, 243, 230, 0.14)",
    linkMuted: "rgba(250, 243, 230, 0.58)",
    scrollMuted: "rgba(250, 243, 230, 0.46)",
    scrollBorder: "rgba(224, 201, 154, 0.36)",
    decorStrong: "rgba(224, 201, 154, 0.32)",
    decorSoft: "rgba(180, 55, 37, 0.24)",
    cornerBorder: "rgba(224, 201, 154, 0.24)",
  };

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[100svh] min-h-[100dvh] items-center justify-center overflow-hidden px-2 sm:px-0"
    >
      {/* ═══ Loading Curtain ═══ */}
      <AnimatePresence>
        {!curtainLifted && (
          <motion.div
            data-intro-curtain
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ backgroundColor: "var(--wusha-bg)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: INTRO_CURTAIN_EXIT_DURATION, ease: INTRO_EASE_OUT }}
          >
            {/* Animated Logo */}
            <motion.div
              data-intro-logo
              initial={{ opacity: 0, scale: 0.72, y: 18, filter: "blur(10px)" }}
              animate={
                introExiting
                  ? {
                      opacity: [1, 0.92, 0.26, 0],
                      scale: [1, 0.98, 0.91, 0.86],
                      y: [0, -5, -24, -34],
                      filter: ["blur(0px)", "blur(1px)", "blur(5px)", "blur(11px)"],
                    }
                  : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
              }
              transition={{
                duration: introExiting ? INTRO_LOGO_EXIT_DURATION : INTRO_LOGO_ENTER_DURATION,
                ease: introExiting ? INTRO_EASE_IN_OUT : INTRO_EASE_OUT,
                times: introExiting ? [0, 0.52, 0.86, 1] : undefined,
              }}
              className="relative"
              style={{ willChange: "transform, opacity, filter" }}
            >
              <motion.div
                animate={{
                  filter:
                    backgroundReady || introExiting
                      ? "blur(0px)"
                      : ["blur(0px)", "blur(2px)", "blur(0px)"],
                  scale: introExiting ? 1 : [1, 1.018, 1],
                }}
                transition={{
                  duration: introExiting ? INTRO_LOGO_EXIT_DURATION : 3.2,
                  repeat: backgroundReady || introExiting ? 0 : Infinity,
                  ease: INTRO_EASE_IN_OUT,
                }}
              >
                <div className={`relative w-[160px] sm:w-[210px] md:w-[250px] ${INTRO_LOGO_ASPECT}`}>
                  <motion.div
                    aria-hidden="true"
                    className="absolute -inset-x-[18%] -inset-y-[24%] rounded-full blur-2xl"
                    style={{ background: "var(--hero-logo-halo-bg)" }}
                    animate={
                      introExiting
                        ? { opacity: [0.62, 0.44, 0.12, 0], scale: [1.04, 1.12, 1.22, 1.28] }
                        : { opacity: [0.5, 0.76, 0.5], scale: [0.96, 1.04, 0.96] }
                    }
                    transition={{
                      duration: introExiting ? INTRO_LOGO_EXIT_DURATION : 4.8,
                      repeat: introExiting ? 0 : Infinity,
                      ease: INTRO_EASE_IN_OUT,
                      times: introExiting ? [0, 0.52, 0.86, 1] : undefined,
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 block blur-[20px]"
                    style={{
                      ...createIntroLogoMask("var(--hero-logo-blur-tone)"),
                      opacity: "var(--hero-logo-blur-opacity)",
                    }}
                  />
                  <span
                    role="img"
                    aria-label="وشّى"
                    className="absolute inset-0 block opacity-95"
                    style={{
                      ...createIntroLogoMask(
                        HERO_LOGO_TONE,
                        "var(--hero-logo-filter)",
                      ),
                    }}
                  />
                </div>
              </motion.div>

              {/* Gold shimmer line under logo */}
              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mt-4 mx-auto"
                initial={{ width: 0, opacity: 0 }}
                animate={
                  introExiting
                    ? {
                        width: ["100%", "76%", "30%", "18%"],
                        opacity: [1, 0.6, 0.12, 0],
                        scaleX: [1, 0.84, 0.42, 0.34],
                      }
                    : { width: "100%", opacity: 1, scaleX: 1 }
                }
                transition={{
                  duration: introExiting ? INTRO_LOGO_EXIT_DURATION * 0.82 : 1.5,
                  delay: introExiting ? 0 : 0.3,
                  ease: introExiting ? INTRO_EASE_IN_OUT : INTRO_EASE_OUT,
                  times: introExiting ? [0, 0.52, 0.86, 1] : undefined,
                }}
                style={{ transformOrigin: "center" }}
              />
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              className="mt-8 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: introExiting ? 0 : 1, y: introExiting ? -8 : 0 }}
              transition={{ duration: 0.45, delay: introExiting ? 0 : 0.5, ease: INTRO_EASE_OUT }}
            >
              {/* Three pulsing dots */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gold/60"
                  animate={{
                    opacity: backgroundReady ? 0 : [0.3, 1, 0.3],
                    scale: backgroundReady ? 0 : [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1.15,
                    repeat: backgroundReady ? 0 : Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>

            {/* Ready checkmark flash */}
            <AnimatePresence>
              {backgroundReady && (
                <motion.span
                  className="absolute bottom-[40%] text-gold/40 text-sm tracking-[0.3em] font-alnaseeb"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: introExiting ? 0 : 1, y: introExiting ? -8 : 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  فنٌ يرتدى
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Hero Background ═══ */}
      <motion.div className="absolute inset-0 z-0" style={{ scale: backgroundScale }}>
        {backgroundMode === "video" ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            controlsList="nodownload nofullscreen noremoteplayback"
            className="video-bg pointer-events-none"
            style={{ objectFit: "cover" }}
          >
            <source src="/videos/HERO1.mp4" type="video/mp4" />
          </video>
        ) : (
          <WushaShaderBackground onReady={handleBackgroundReady} />
        )}
      </motion.div>

      {/* ═══ Hero Overlay — Gradient ═══ */}
      <div className="video-overlay" />

      {/* ═══ Gold Atmospheric Particles ═══ */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        {[
          { size: "w-1 h-1",     top: "20%", right: "15%", dur: 4,   del: 0,   opa: [0.4, 1,   0.4], drift: -30 },
          { size: "w-1.5 h-1.5", top: "60%", right: "80%", dur: 5.5, del: 1,   opa: [0.3, 0.8, 0.3], drift: -20 },
          { size: "w-0.5 h-0.5", top: "40%", right: "50%", dur: 6,   del: 2,   opa: [0.2, 0.7, 0.2], drift: -40 },
          { size: "w-1 h-1",     top: "75%", right: "25%", dur: 4.5, del: 0.5, opa: [0.3, 0.9, 0.3], drift: -25 },
          { size: "w-2 h-2",     top: "30%", right: "65%", dur: 7,   del: 1.5, opa: [0.15,0.5, 0.15],drift: -18 },
          { size: "w-0.5 h-0.5", top: "85%", right: "40%", dur: 5,   del: 3,   opa: [0.2, 0.6, 0.2], drift: -35 },
          { size: "w-1 h-1",     top: "15%", right: "40%", dur: 6.5, del: 2.5, opa: [0.25,0.75,0.25],drift: -22 },
        ].map((p, i) => (
          <motion.div
            key={i}
            className={`absolute ${p.size} rounded-full bg-gold`}
            style={{ top: p.top, right: p.right }}
            animate={{ y: [0, p.drift, 0], opacity: p.opa }}
            transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.del }}
          />
        ))}
      </div>

      {/* ═══ Main Content ═══ */}
      <motion.div
        className="relative z-10 container-wusha text-center px-4 sm:px-6"
        style={{ y, opacity, scale }}
      >
        {/* Main Title */}
        <motion.div
          className="mb-2 sm:mb-3 flex justify-center cursor-pointer select-none"
          initial={{ opacity: 0, y: 60, filter: "blur(10px)" }}
          animate={curtainLifted ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleAdminSignIn}
        >
          <div className={`relative w-[280px] sm:w-[390px] md:w-[520px] lg:w-[640px] ${HERO_LOGO_ASPECT}`}>
            <motion.div
              aria-hidden="true"
              className="absolute -inset-x-[10%] -inset-y-[12%] rounded-full blur-2xl"
              style={{ background: "var(--hero-logo-halo-bg)" }}
              animate={{ opacity: [0.25, 0.44, 0.25], scale: [0.97, 1.025, 0.97] }}
              transition={{ duration: 8.4, repeat: Infinity, ease: [0.45, 0, 0.15, 1] }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-[10%] inset-y-[24%] rounded-full blur-2xl"
              style={{ background: "var(--hero-logo-inner-halo-bg)" }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 block blur-[20px]"
              style={{
                ...createHeroLogoMask("var(--hero-logo-blur-tone)"),
                opacity: "var(--hero-logo-blur-opacity)",
              }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 block blur-[46px]"
              style={{
                ...createHeroLogoMask("var(--hero-logo-pearl-tone)"),
                opacity: "var(--hero-logo-pearl-opacity)",
              }}
            />
            <span
              role="img"
              aria-label="وشّى"
              className="absolute inset-0 block"
              style={{
                ...createHeroLogoMask(
                  HERO_LOGO_TONE,
                  "var(--hero-logo-filter)",
                ),
              }}
            />
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 block mix-blend-soft-light"
              style={{
                ...createHeroLogoMask("transparent"),
                backgroundImage: "var(--hero-logo-shimmer-gradient)",
                backgroundPosition: "180% 50%",
                backgroundSize: "280% 100%",
                filter: "var(--hero-logo-shimmer-filter)",
              }}
              initial={{ opacity: 0, backgroundPosition: "180% 50%" }}
              animate={{
                backgroundPosition: ["180% 50%", "-90% 50%"],
                opacity: [0, 0.14, 0.08, 0],
              }}
              transition={{
                duration: 12.5,
                repeat: Infinity,
                repeatDelay: 7.5,
                ease: [0.45, 0, 0.15, 1],
              }}
            />
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.div
          className="mb-10 sm:mb-14 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 30 }}
          animate={curtainLifted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.5 }}
        >
          <p
            className="font-alnaseeb text-4xl font-bold text-glow-gold sm:text-5xl md:text-6xl"
            style={{ color: "var(--hero-subtitle)", letterSpacing: 0, fontWeight: 700 }}
          >
            فنٌ يُرتدى
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <span
              className="text-sm font-semibold uppercase sm:text-[15px]"
              style={{ color: "var(--hero-tagline-text)", letterSpacing: 0 }}
            >
              art you wear
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
        </motion.div>

        {/* CTA Buttons — تظهر فقط عند تفعيلها من الإعدادات */}
        {showAuthButtons && (
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={curtainLifted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <SignedIn>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <motion.button
                  type="button"
                    className="group relative px-8 py-4 font-bold rounded-2xl border overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      borderColor: "var(--hero-scroll-border)",
                      background: "linear-gradient(120deg, rgba(250, 243, 230, 0.14), rgba(180, 55, 37, 0.2))",
                      color: "rgba(250, 243, 230, 0.92)",
                    }}
                    whileHover={{
                      boxShadow: "0 8px 32px var(--neon-gold)",
                      borderColor: "var(--wusha-gold)",
                    }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/store")}
                  suppressHydrationWarning
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    المتجر
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ←
                    </motion.span>
                  </span>
                </motion.button>
                {showWashaAiButton ? (
                  <motion.button
                    type="button"
                    className="group relative px-8 py-4 font-bold rounded-2xl border overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      borderColor: "rgba(168, 85, 247, 0.32)",
                      background: "linear-gradient(120deg, rgba(154, 123, 61, 0.2), rgba(180, 55, 37, 0.2), rgba(250, 243, 230, 0.1))",
                      color: "rgba(250, 243, 230, 0.92)",
                    }}
                    whileHover={{
                      boxShadow: "0 8px 32px rgba(168, 85, 247, 0.22)",
                      borderColor: "rgba(192, 132, 252, 0.4)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/design/washa-ai")}
                    suppressHydrationWarning
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      WASHA AI
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ←
                      </motion.span>
                    </span>
                  </motion.button>
                ) : null}
              </div>
            </SignedIn>
            <SignedOut>
              <div className="flex flex-col items-center gap-8">
                {/* ═══ Outer Radiant Halo ═══ */}
                <div className="relative">
                  <motion.div
                    className="absolute -inset-6 sm:-inset-8 rounded-[3.5rem] pointer-events-none"
                    style={{
                      background: "var(--hero-ai-card-halo)",
                    }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.97, 1.02, 0.97] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <motion.button
                    type="button"
                    className="group relative px-10 sm:px-14 py-8 sm:py-10 font-bold rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:scale-[1.04] active:scale-[0.98] w-full sm:w-[420px]"
                    style={{
                      background: "var(--hero-ai-card-bg)",
                      backdropFilter: "blur(20px) saturate(1.8)",
                      border: "1.5px solid var(--hero-ai-card-border)",
                      boxShadow: "var(--hero-ai-card-shadow)",
                    }}
                    whileHover={{
                      boxShadow: "var(--hero-ai-card-shadow-hover)",
                      borderColor: "var(--hero-ai-card-border-hover)",
                    }}
                    onClick={() => router.push("/design/washa-ai")}
                    suppressHydrationWarning
                  >
                    {/* Subtle warm gradient overlay */}
                    <div className="absolute inset-0 rounded-[2.5rem] opacity-90" style={{ background: "var(--hero-ai-card-overlay)" }} />

                    {/* Soft traveling sheen */}
                    <motion.div
                      className="absolute inset-y-[-70%] left-[-52%] w-[34%] rotate-[-18deg] bg-gradient-to-r from-transparent via-[#f5ded8]/[0.08] to-transparent"
                      initial={{ x: "-220%", opacity: 0 }}
                      animate={{ x: ["-220%", "420%"], opacity: [0, 0.12, 0] }}
                      transition={{
                        duration: 11.5,
                        repeat: Infinity,
                        repeatDelay: 7,
                        ease: [0.45, 0, 0.15, 1],
                      }}
                    />

                    {/* Light noise texture for depth */}
                    <div className="absolute inset-0 rounded-[2.5rem] opacity-[0.055] mix-blend-soft-light" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />

                    <div className="relative z-10 flex flex-col items-center gap-5">
                      {/* AI Icon + Brand */}
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl"
                          style={{
                            background: "rgba(255, 238, 210, 0.1)",
                            border: "1px solid var(--hero-ai-card-border)",
                            boxShadow: "0 2px 12px rgba(206, 174, 127, 0.14)",
                          }}
                          animate={{ boxShadow: ["0 2px 8px rgba(206,174,127,0.12)", "0 4px 16px rgba(206,174,127,0.25)", "0 2px 8px rgba(206,174,127,0.12)"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Sparkles className="w-5 h-5" style={{ color: "var(--hero-ai-card-status)" }} />
                        </motion.div>
                        <span
                          className="text-3xl sm:text-4xl font-alnaseeb italic tracking-widest"
                          style={{
                            background: "var(--hero-ai-card-title)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            filter: "drop-shadow(0 1px 8px rgba(218, 185, 145, 0.18))",
                          }}
                        >
                          WASHA AI
                        </span>
                      </div>

                      {/* Elegant divider */}
                      <div className="flex items-center gap-3 w-full max-w-[200px]">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--hero-ai-card-line)]" />
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--hero-ai-card-status)" }} />
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--hero-ai-card-line)]" />
                      </div>

                      {/* CTA Text */}
                      <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em]" style={{ color: "var(--hero-ai-card-text)" }}>
                        <span>صمّم خيالك في ثوانٍ</span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{ color: "var(--hero-ai-card-status)" }}
                        >
                          ←
                        </motion.span>
                      </div>

                      {/* Micro badge */}
                      <div
                        className="flex items-center gap-1.5 rounded-full px-3 py-1"
                        style={{
                          background: "var(--hero-ai-card-chip-bg)",
                          border: "1px solid var(--hero-ai-card-chip-border)",
                        }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--hero-ai-card-status)" }} />
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--hero-ai-card-chip-text)" }}>
                          متاح الآن
                        </span>
                      </div>
                    </div>

                    {/* Corner Ornaments — warm gold on light */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-[1.5px] border-l-[1.5px]" style={{ borderColor: "var(--hero-ai-card-border)" }} />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-[1.5px] border-r-[1.5px]" style={{ borderColor: "var(--hero-ai-card-border)" }} />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-[1.5px] border-l-[1.5px]" style={{ borderColor: "var(--hero-ai-card-border)" }} />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-[1.5px] border-r-[1.5px]" style={{ borderColor: "var(--hero-ai-card-border)" }} />
                  </motion.button>
                </div>

                {/* Auth Links — subtle and elegant */}
                <div className="flex items-center gap-5">
                  <Link
                    href="/sign-in"
                    className="group flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.25em] uppercase transition-all duration-400"
                    style={{ color: "rgba(250, 243, 230, 0.45)" }}
                  >
                    <LogIn className="w-3 h-3 opacity-60 transition-opacity group-hover:opacity-100" />
                    <span className="transition-colors group-hover:text-gold">الدخول</span>
                  </Link>
                  <div className="h-3 w-px bg-gradient-to-b from-transparent via-gold/20 to-transparent" />
                  <Link
                    href="/sign-up"
                    className="group flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.25em] uppercase transition-all duration-400"
                    style={{ color: "rgba(250, 243, 230, 0.45)" }}
                  >
                    <UserPlus className="w-3 h-3 opacity-60 transition-opacity group-hover:opacity-100" />
                    <span className="transition-colors group-hover:text-gold">حساب جديد</span>
                  </Link>
                </div>
              </div>
            </SignedOut>
          </motion.div>
        )}
      </motion.div>

      {/* Join Modal */}
      <JoinModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={curtainLifted ? { opacity: 1 } : {}}
        transition={{ delay: 1.8 }}
      >
        <span className="text-[10px] tracking-[0.4em] uppercase"
          style={{ color: heroTokens.scrollMuted }}>
          اكتشف
        </span>
        <motion.div
          className="relative w-6 h-10 rounded-full border flex items-start justify-center pt-1.5"
          style={{ borderColor: heroTokens.scrollBorder }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-2 rounded-full bg-gold/60"
            animate={{ y: [0, 14, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>

      {/* Decorative Gold Lines */}
      <motion.div
        className="absolute top-1/4 right-10 w-px h-44 hidden lg:block z-10"
        style={{ background: `linear-gradient(to bottom, transparent, ${heroTokens.decorStrong} 40%, ${heroTokens.decorSoft} 70%, transparent)` }}
        initial={{ scaleY: 0, originY: 0 }}
        animate={curtainLifted ? { scaleY: 1 } : {}}
        transition={{ duration: 1.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute top-1/3 left-10 w-px h-32 hidden lg:block z-10"
        style={{ background: `linear-gradient(to bottom, transparent, ${heroTokens.decorSoft} 50%, transparent)` }}
        initial={{ scaleY: 0, originY: 0 }}
        animate={curtainLifted ? { scaleY: 1 } : {}}
        transition={{ duration: 1.8, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Corner ornaments */}
      <motion.div
        className="absolute top-8 right-8 hidden lg:block z-10"
        initial={{ opacity: 0 }}
        animate={curtainLifted ? { opacity: 1 } : {}}
        transition={{ delay: 2 }}
      >
        <div className="w-6 h-6 border-t border-r" style={{ borderColor: heroTokens.cornerBorder }} />
      </motion.div>
      <motion.div
        className="absolute top-8 left-8 hidden lg:block z-10"
        initial={{ opacity: 0 }}
        animate={curtainLifted ? { opacity: 1 } : {}}
        transition={{ delay: 2.1 }}
      >
        <div className="w-6 h-6 border-t border-l" style={{ borderColor: heroTokens.cornerBorder }} />
      </motion.div>
      <motion.div
        className="absolute bottom-16 right-8 hidden lg:block z-10"
        initial={{ opacity: 0 }}
        animate={curtainLifted ? { opacity: 1 } : {}}
        transition={{ delay: 2.2 }}
      >
        <div className="w-6 h-6 border-b border-r" style={{ borderColor: heroTokens.cornerBorder }} />
      </motion.div>
      <motion.div
        className="absolute bottom-16 left-8 hidden lg:block z-10"
        initial={{ opacity: 0 }}
        animate={curtainLifted ? { opacity: 1 } : {}}
        transition={{ delay: 2.3 }}
      >
        <div className="w-6 h-6 border-b border-l" style={{ borderColor: heroTokens.cornerBorder }} />
      </motion.div>
    </section>
  );
}
