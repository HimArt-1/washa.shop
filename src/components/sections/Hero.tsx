"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowDown, LogIn, UserPlus, Sparkles, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JoinModal } from "@/components/ui/JoinModal";
import { SignedIn, SignedOut } from "@clerk/nextjs";

interface HeroProps {
  showAuthButtons?: boolean;
  showWashaAiButton?: boolean;
  showJoinArtistButton?: boolean;
}

export function Hero({ showAuthButtons = true, showWashaAiButton = true, showJoinArtistButton = false }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
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
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  // Handle video ready state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onCanPlay = () => setVideoReady(true);

    // If already loaded (cached)
    if (video.readyState >= 3) {
      setVideoReady(true);
    } else {
      video.addEventListener("canplay", onCanPlay);
    }

    // Safety timeout — lift curtain after 4s no matter what
    const fallback = setTimeout(() => setVideoReady(true), 4000);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      clearTimeout(fallback);
    };
  }, []);

  // Lift curtain 600ms after video is ready (let animation breathe)
  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => setCurtainLifted(true), 600);
    return () => clearTimeout(timer);
  }, [videoReady]);

  const heroTokens = {
    subtitle: "var(--hero-subtitle)",
    secondaryBorder: "var(--hero-secondary-border)",
    secondaryBg: "var(--hero-secondary-bg)",
    secondaryText: "var(--hero-secondary-text)",
    secondaryBorderHover: "var(--hero-secondary-border-hover)",
    secondaryBgHover: "var(--hero-secondary-bg-hover)",
    linkMuted: "var(--hero-link-muted)",
    scrollMuted: "var(--hero-scroll-muted)",
    scrollBorder: "var(--hero-scroll-border)",
    decorStrong: "var(--hero-decor-strong)",
    decorSoft: "var(--hero-decor-soft)",
    cornerBorder: "var(--hero-corner-border)",
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
                  filter: videoReady ? "blur(0px)" : ["blur(0px)", "blur(2px)", "blur(0px)"],
                }}
                transition={{ duration: 2, repeat: videoReady ? 0 : Infinity, ease: "easeInOut" }}
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
                    opacity: videoReady ? 0 : [0.3, 1, 0.3],
                    scale: videoReady ? 0 : [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: videoReady ? 0 : Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>

            {/* Ready checkmark flash */}
            <AnimatePresence>
              {videoReady && (
                <motion.span
                  className="absolute bottom-[40%] text-gold/40 text-sm tracking-[0.3em]"
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

      {/* ═══ Video Background ═══ */}
      <motion.div className="absolute inset-0 z-0" style={{ scale: videoScale }}>
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
      </motion.div>

      {/* ═══ Video Overlay — Gradient ═══ */}
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
          <p className="text-3xl sm:text-4xl md:text-5xl font-display italic text-glow-gold"
            style={{ color: heroTokens.subtitle, letterSpacing: "0.04em" }}>
            فنٌ يرتدى
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <span className="text-xs tracking-[0.3em] text-theme-faint uppercase">art you wear</span>
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
                      background: "var(--ai-step-active-bg)",
                      color: "var(--wusha-text)",
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
                      background: "linear-gradient(120deg, rgba(154, 123, 61, 0.18), rgba(168, 85, 247, 0.18), rgba(192, 132, 252, 0.16))",
                      color: "var(--wusha-text)",
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
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <Link
                    href="/sign-up"
                    className="group flex items-center justify-center gap-2.5 px-8 py-4 font-bold rounded-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto min-w-[160px]"
                    style={{
                      background: "linear-gradient(to right, var(--wusha-earth), var(--wusha-gold), var(--wusha-earth))",
                      color: "var(--wusha-bg)",
                      boxShadow: "0 4px 24px var(--neon-gold)",
                    }}
                  >
                    <UserPlus className="w-4 h-4 opacity-80" />
                    إنشاء حساب
                  </Link>
                  <Link
                    href="/sign-in"
                    className="flex items-center justify-center gap-2.5 px-8 py-4 font-medium rounded-2xl border backdrop-blur-md transition-all duration-300 w-full sm:w-auto min-w-[160px]"
                    style={{
                      borderColor: heroTokens.secondaryBorder,
                      backgroundColor: heroTokens.secondaryBg,
                      color: heroTokens.secondaryText,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = heroTokens.secondaryBorderHover;
                      e.currentTarget.style.backgroundColor = heroTokens.secondaryBgHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = heroTokens.secondaryBorder;
                      e.currentTarget.style.backgroundColor = heroTokens.secondaryBg;
                    }}
                  >
                    <LogIn className="w-4 h-4 opacity-70" />
                    تسجيل الدخول
                  </Link>
                </div>
                {showJoinArtistButton && (
                  <button
                    type="button"
                    onClick={() => setJoinOpen(true)}
                    className="text-sm font-medium transition-colors underline-offset-4 hover:underline"
                    style={{
                      color: heroTokens.linkMuted,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--wusha-gold)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = heroTokens.linkMuted;
                    }}
                    suppressHydrationWarning
                  >
                    انضم كفنان إلى المنصة
                  </button>
                )}
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
