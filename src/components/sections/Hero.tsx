"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Sparkles, ShoppingBag } from "lucide-react";
import Image from "next/image";
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

export function Hero({
  backgroundMode = "shader",
  showAuthButtons = true,
  showWashaAiButton = true,
  showJoinArtistButton = false,
}: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [backgroundReady, setBackgroundReady] = useState(false);
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

  // Lift curtain 600ms after the shader is ready (let animation breathe)
  useEffect(() => {
    if (!backgroundReady) return;
    const timer = setTimeout(() => setCurtainLifted(true), 600);
    return () => clearTimeout(timer);
  }, [backgroundReady]);

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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ backgroundColor: "var(--wusha-bg)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Animated Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <motion.div
                animate={{
                  filter: backgroundReady ? "blur(0px)" : ["blur(0px)", "blur(2px)", "blur(0px)"],
                }}
                transition={{ duration: 2, repeat: backgroundReady ? 0 : Infinity, ease: "easeInOut" }}
              >
                <div className="relative w-[180px] sm:w-[220px] md:w-[280px] aspect-[280/160]">
                  <Image
                    src="/hero-logo.png"
                    alt="وشّى"
                    fill
                    sizes="(max-width: 640px) 180px, (max-width: 768px) 220px, 280px"
                    className="object-contain brightness-0 invert sepia saturate-[2] hue-rotate-[5deg] opacity-90"
                    priority
                  />
                </div>
              </motion.div>

              {/* Gold shimmer line under logo */}
              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mt-4 mx-auto"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
              />
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              className="mt-8 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
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
                    duration: 1,
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
                  animate={{ opacity: 1, y: 0 }}
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
          <div className="relative w-[180px] sm:w-[250px] md:w-[350px] lg:w-[450px] aspect-[450/260]">
            <Image
              src="/hero-logo.png"
              alt="وشّى"
              fill
              sizes="(max-width: 640px) 180px, (max-width: 768px) 250px, (max-width: 1024px) 350px, 450px"
              className="object-contain brightness-0 invert sepia saturate-[2] hue-rotate-[5deg] drop-shadow-[0_0_40px_rgba(206,174,127,0.25)]"
              priority
              draggable={false}
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
          <p className="text-3xl sm:text-4xl md:text-5xl font-alnaseeb italic text-glow-gold"
            style={{ color: heroTokens.subtitle, letterSpacing: "0.04em" }}>
            فنٌ يرتدى
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <span className="text-xs tracking-[0.3em] uppercase text-[rgba(250,243,230,0.58)]">art you wear</span>
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
                      background: "radial-gradient(ellipse at center, rgba(206, 174, 127, 0.12) 0%, rgba(206, 174, 127, 0.04) 50%, transparent 70%)",
                    }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.97, 1.02, 0.97] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <motion.button
                    type="button"
                    className="group relative px-10 sm:px-14 py-8 sm:py-10 font-bold rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:scale-[1.04] active:scale-[0.98] w-full sm:w-[420px]"
                    style={{
                      background: "linear-gradient(145deg, rgba(255, 253, 248, 0.92) 0%, rgba(250, 245, 235, 0.88) 40%, rgba(245, 238, 225, 0.85) 100%)",
                      backdropFilter: "blur(20px) saturate(1.8)",
                      border: "1.5px solid rgba(206, 174, 127, 0.35)",
                      boxShadow: "0 8px 40px rgba(206, 174, 127, 0.18), 0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
                    }}
                    whileHover={{
                      boxShadow: "0 20px 60px rgba(206, 174, 127, 0.3), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
                      borderColor: "rgba(206, 174, 127, 0.6)",
                    }}
                    onClick={() => router.push("/design/washa-ai")}
                    suppressHydrationWarning
                  >
                    {/* Subtle warm gradient overlay */}
                    <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/40 via-transparent to-amber-50/30 opacity-60" />

                    {/* Golden shimmer sweep */}
                    <motion.div
                      className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-amber-200/25 to-transparent skew-x-[-20deg]"
                      animate={{ left: ["-100%", "200%"] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                    />

                    {/* Light noise texture for depth */}
                    <div className="absolute inset-0 rounded-[2.5rem] opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />

                    <div className="relative z-10 flex flex-col items-center gap-5">
                      {/* AI Icon + Brand */}
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl"
                          style={{
                            background: "linear-gradient(135deg, rgba(206, 174, 127, 0.2) 0%, rgba(180, 140, 80, 0.15) 100%)",
                            border: "1px solid rgba(206, 174, 127, 0.3)",
                            boxShadow: "0 2px 8px rgba(206, 174, 127, 0.12)",
                          }}
                          animate={{ boxShadow: ["0 2px 8px rgba(206,174,127,0.12)", "0 4px 16px rgba(206,174,127,0.25)", "0 2px 8px rgba(206,174,127,0.12)"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Sparkles className="w-5 h-5" style={{ color: "#9a7b3d" }} />
                        </motion.div>
                        <span
                          className="text-3xl sm:text-4xl font-alnaseeb italic tracking-widest"
                          style={{
                            background: "linear-gradient(135deg, #6b5426 0%, #9a7b3d 45%, #c9a84c 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            filter: "drop-shadow(0 1px 2px rgba(154, 123, 61, 0.15))",
                          }}
                        >
                          WASHA AI
                        </span>
                      </div>

                      {/* Elegant divider */}
                      <div className="flex items-center gap-3 w-full max-w-[200px]">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-700/20" />
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #c9a84c, #9a7b3d)" }} />
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-700/20" />
                      </div>

                      {/* CTA Text */}
                      <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em]" style={{ color: "#6b5c3e" }}>
                        <span>صمّم خيالك في ثوانٍ</span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{ color: "#9a7b3d" }}
                        >
                          ←
                        </motion.span>
                      </div>

                      {/* Micro badge */}
                      <div
                        className="flex items-center gap-1.5 rounded-full px-3 py-1"
                        style={{
                          background: "rgba(206, 174, 127, 0.1)",
                          border: "1px solid rgba(206, 174, 127, 0.2)",
                        }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "#8b7542" }}>
                          متاح الآن
                        </span>
                      </div>
                    </div>

                    {/* Corner Ornaments — warm gold on light */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-[1.5px] border-l-[1.5px]" style={{ borderColor: "rgba(206, 174, 127, 0.3)" }} />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-[1.5px] border-r-[1.5px]" style={{ borderColor: "rgba(206, 174, 127, 0.3)" }} />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-[1.5px] border-l-[1.5px]" style={{ borderColor: "rgba(206, 174, 127, 0.3)" }} />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-[1.5px] border-r-[1.5px]" style={{ borderColor: "rgba(206, 174, 127, 0.3)" }} />
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
