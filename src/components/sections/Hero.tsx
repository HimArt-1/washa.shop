"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowDown, LogIn, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JoinModal } from "@/components/ui/JoinModal";
import { SignedIn, SignedOut } from "@clerk/nextjs";

interface HeroProps {
  showAuthButtons?: boolean;
}

export function Hero({ showAuthButtons = true }: HeroProps) {
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

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen min-h-[100dvh] flex items-center justify-center overflow-hidden px-2 sm:px-0"
    >
      {/* ═══ Loading Curtain ═══ */}
      <AnimatePresence>
        {!curtainLifted && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080808]"
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
          preload="auto"
          className="video-bg"
        >
          <source src="/videos/HERO1.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* ═══ Video Overlay — Gradient ═══ */}
      <div className="video-overlay" />

      {/* ═══ Subtle Gold Particles ═══ */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-gold/40"
          style={{ top: "20%", right: "15%" }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-1.5 h-1.5 rounded-full bg-gold/30"
          style={{ top: "60%", right: "80%" }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute w-0.5 h-0.5 rounded-full bg-gold/50"
          style={{ top: "40%", right: "50%" }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* ═══ Main Content ═══ */}
      <motion.div
        className="relative z-10 container-wusha text-center px-4 sm:px-6"
        style={{ y, opacity, scale }}
      >
        {/* Main Title */}
        <motion.div
          className="mb-2 sm:mb-3 mt-16 sm:mt-20 md:mt-24 flex justify-center cursor-pointer select-none"
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
        <motion.p
          className="text-lg sm:text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 sm:mb-14 font-light"
          initial={{ opacity: 0, y: 30 }}
          animate={curtainLifted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          فنٌ يرتدى
        </motion.p>

        {/* CTA Buttons — تظهر فقط عند تفعيلها من الإعدادات */}
        {showAuthButtons && (
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={curtainLifted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <SignedIn>
              <motion.button
                type="button"
                className="group relative px-8 py-4 font-bold rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #ceae7f 0%, #b8964f 50%, #ceae7f 100%)",
                  color: "#0a0a0a",
                  boxShadow: "0 4px 24px rgba(206, 174, 127, 0.25)",
                }}
                whileHover={{ boxShadow: "0 8px 40px rgba(206, 174, 127, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/store")}
                suppressHydrationWarning
              >
                <span className="relative z-10 flex items-center gap-2">
                  المتجر
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ←
                  </motion.span>
                </span>
              </motion.button>
            </SignedIn>
            <SignedOut>
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <Link
                    href="/sign-up"
                    className="group flex items-center justify-center gap-2.5 px-8 py-4 font-bold rounded-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto min-w-[160px]"
                    style={{
                      background: "linear-gradient(135deg, #ceae7f 0%, #b8964f 50%, #ceae7f 100%)",
                      color: "#0a0a0a",
                      boxShadow: "0 4px 24px rgba(206, 174, 127, 0.25)",
                    }}
                  >
                    <UserPlus className="w-4 h-4 opacity-80" />
                    إنشاء حساب
                  </Link>
                  <Link
                    href="/sign-in"
                    className="flex items-center justify-center gap-2.5 px-8 py-4 font-medium rounded-2xl border border-white/30 bg-white/5 backdrop-blur-md text-white/90 transition-all duration-300 hover:bg-white/10 hover:border-gold/40 w-full sm:w-auto min-w-[160px]"
                  >
                    <LogIn className="w-4 h-4 opacity-70" />
                    تسجيل الدخول
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setJoinOpen(true)}
                  className="text-white/50 hover:text-gold text-sm font-medium transition-colors underline-offset-4 hover:underline"
                  suppressHydrationWarning
                >
                  انضم كفنان إلى المنصة
                </button>
              </div>
            </SignedOut>
          </motion.div>
        )}
      </motion.div>

      {/* Join Modal */}
      <JoinModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 hidden sm:block"
        initial={{ opacity: 0 }}
        animate={curtainLifted ? { opacity: 1 } : {}}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-white/30"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs tracking-widest">اكتشف المزيد</span>
          <ArrowDown className="w-4 h-4" />
        </motion.div>
      </motion.div>

      {/* Decorative Gold Lines */}
      <motion.div
        className="absolute top-1/4 right-10 w-px h-32 bg-gradient-to-b from-transparent via-gold/20 to-transparent hidden lg:block z-10"
        initial={{ scaleY: 0 }}
        animate={curtainLifted ? { scaleY: 1 } : {}}
        transition={{ duration: 1.5, delay: 1.2 }}
      />
      <motion.div
        className="absolute top-1/3 left-10 w-px h-24 bg-gradient-to-b from-transparent via-gold/10 to-transparent hidden lg:block z-10"
        initial={{ scaleY: 0 }}
        animate={curtainLifted ? { scaleY: 1 } : {}}
        transition={{ duration: 1.5, delay: 1.5 }}
      />
    </section>
  );
}
