"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────

type Theme = "dark" | "light";
type SceneId = "void" | "mark" | "word" | "craft" | "intel" | "seal";

const SCENES: SceneId[] = ["void", "mark", "word", "craft", "intel", "seal"];

const DURATIONS: Record<SceneId, number> = {
  void:  2600,
  mark:  4200,
  word:  4000,
  craft: 4200,
  intel: 3800,
  seal:  3400,
};

// ─────────────────────────────────────────────────────────────────
// Theme Design Tokens
// ─────────────────────────────────────────────────────────────────

interface ThemeTokens {
  bg:            string;
  surface:       string;
  gold:          string;
  goldSoft:      string;
  goldFaint:     string;
  goldLine:      string;
  goldGlow:      string;
  text:          string;
  textMuted:     string;
  logoTone:      string;
  logoFilter:    string;
  lineGrad:      string;
  lineGradV:     string;
  halo:          string;
  haloWarm:      string;
  aiGlow:        string;
  productFilter: string;
  particleColor: string;
  grainOpacity:  number;
  letterbox:     boolean;
}

const T: Record<Theme, ThemeTokens> = {
  dark: {
    bg:             "#060504",
    surface:        "#0a0806",
    gold:           "#ceae7f",
    goldSoft:       "rgba(206,174,127,0.55)",
    goldFaint:      "rgba(206,174,127,0.18)",
    goldLine:       "rgba(206,174,127,0.26)",
    goldGlow:       "rgba(206,174,127,0.38)",
    text:           "#f0ebe3",
    textMuted:      "rgba(240,235,227,0.46)",
    logoTone:       "#d4aa70",
    logoFilter:     "drop-shadow(0 0 44px rgba(206,174,127,0.62)) drop-shadow(0 22px 70px rgba(0,0,0,0.85)) brightness(1.08)",
    lineGrad:       "linear-gradient(90deg, transparent, rgba(206,174,127,0.52), transparent)",
    lineGradV:      "linear-gradient(180deg, transparent, rgba(206,174,127,0.38), transparent)",
    halo:           "radial-gradient(circle, rgba(206,174,127,0.26) 0%, rgba(206,174,127,0.08) 42%, transparent 74%)",
    haloWarm:       "radial-gradient(ellipse at 50% 30%, rgba(180,55,37,0.14) 0%, transparent 55%)",
    aiGlow:         "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(107,91,122,0.28) 0%, rgba(206,174,127,0.10) 48%, transparent 82%)",
    productFilter:  "brightness(1.02) contrast(1.04) saturate(0.96)",
    particleColor:  "rgba(206,174,127,0.72)",
    grainOpacity:   0.048,
    letterbox:      true,
  },
  light: {
    bg:             "#f4ede3",
    surface:        "#fffaf5",
    gold:           "#9a7b3d",
    goldSoft:       "rgba(154,123,61,0.5)",
    goldFaint:      "rgba(154,123,61,0.12)",
    goldLine:       "rgba(154,123,61,0.22)",
    goldGlow:       "rgba(154,123,61,0.30)",
    text:           "#1a1612",
    textMuted:      "rgba(26,22,18,0.48)",
    logoTone:       "#4b3434",
    logoFilter:     "drop-shadow(0 2px 34px rgba(75,52,52,0.42)) drop-shadow(0 14px 52px rgba(75,52,52,0.26))",
    lineGrad:       "linear-gradient(90deg, transparent, rgba(154,123,61,0.44), transparent)",
    lineGradV:      "linear-gradient(180deg, transparent, rgba(154,123,61,0.30), transparent)",
    halo:           "radial-gradient(circle, rgba(75,52,52,0.16) 0%, rgba(75,52,52,0.05) 42%, transparent 74%)",
    haloWarm:       "radial-gradient(ellipse at 50% 30%, rgba(202,164,95,0.18) 0%, transparent 55%)",
    aiGlow:         "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(107,91,122,0.16) 0%, rgba(154,123,61,0.07) 48%, transparent 82%)",
    productFilter:  "brightness(1.01) contrast(1.01) saturate(0.98)",
    particleColor:  "rgba(154,123,61,0.60)",
    grainOpacity:   0.028,
    letterbox:      false,
  },
};

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────

const EASE_CINEMA  = [0.16, 1,    0.3, 1 ] as const;
const EASE_EXPO_IN = [0.76, 0,    0.24, 1 ] as const;
const EASE_SHARP   = [0.25, 0.46, 0.45, 0.94] as const;

const LOGO_SRC = "/hero-logo-cinematic.png";
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

function logoMaskStyle(tone: string, filter?: string): React.CSSProperties {
  return {
    backgroundColor:        tone,
    WebkitMaskImage:        `url(${LOGO_SRC})`,
    maskImage:              `url(${LOGO_SRC})`,
    WebkitMaskPosition:     "center",
    maskPosition:           "center",
    WebkitMaskRepeat:       "no-repeat",
    maskRepeat:             "no-repeat",
    WebkitMaskSize:         "contain",
    maskSize:               "contain",
    filter,
  };
}

const sceneVariants = {
  enter:  { opacity: 0, scale: 1.018 },
  center: { opacity: 1, scale: 1,    transition: { duration: 0.95, ease: EASE_CINEMA } },
  exit:   { opacity: 0, scale: 0.982, transition: { duration: 0.80, ease: EASE_CINEMA } },
};

// ─────────────────────────────────────────────────────────────────
// Shared: Horizontal rule
// ─────────────────────────────────────────────────────────────────

function GoldLine({
  width = "min(340px,52vw)",
  delay = 0,
  vertical = false,
  height = "min(180px,28vh)",
  t,
}: {
  width?: string;
  delay?: number;
  vertical?: boolean;
  height?: string;
  t: ThemeTokens;
}) {
  if (vertical) {
    return (
      <motion.div
        style={{ width: 1, background: t.lineGradV, height: 0 }}
        animate={{ height }}
        transition={{ duration: 1.4, ease: EASE_CINEMA, delay }}
      />
    );
  }
  return (
    <motion.div
      style={{ height: 1, background: t.lineGrad, width: 0 }}
      animate={{ width }}
      transition={{ duration: 1.3, ease: EASE_CINEMA, delay }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene: VOID
// ─────────────────────────────────────────────────────────────────

function SceneVoid({ t }: { t: ThemeTokens }) {
  return (
    <motion.div
      key="void"
      variants={sceneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* Horizon line expanding */}
      <motion.div
        className="absolute"
        style={{ top: "50%", left: 0, right: 0, height: 1, background: t.lineGrad }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 2.0, ease: EASE_CINEMA, delay: 0.3 }}
      />

      {/* Vertical gate opening */}
      <motion.div
        className="absolute"
        style={{ left: "50%", width: 1, background: t.lineGradV, height: 0 }}
        animate={{ height: "40vh" }}
        transition={{ duration: 1.6, ease: EASE_CINEMA, delay: 0.8 }}
      />

      {/* Center point */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 4, height: 4, backgroundColor: t.gold }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6, 1], opacity: [0, 1, 0.7] }}
        transition={{ duration: 1.0, ease: EASE_CINEMA, delay: 1.2 }}
      />

      {/* Ambient radial glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${t.goldFaint}, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.4] }}
        transition={{ duration: 2.2, ease: EASE_CINEMA }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene: MARK (Logo Revelation)
// ─────────────────────────────────────────────────────────────────

function SceneMark({ t }: { t: ThemeTokens }) {
  return (
    <motion.div
      key="mark"
      variants={sceneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="relative flex flex-col items-center gap-7">
        {/* Outer radiant halo */}
        <motion.div
          className="absolute -inset-[38%] rounded-full pointer-events-none"
          style={{ background: t.halo }}
          initial={{ opacity: 0, scale: 0.65 }}
          animate={{ opacity: [0, 1, 0.65], scale: [0.65, 1.12, 1.0] }}
          transition={{ duration: 2.4, ease: EASE_CINEMA, delay: 0.15 }}
        />

        {/* Inner warm halo */}
        <motion.div
          className="absolute inset-[-20%] rounded-full pointer-events-none"
          style={{ background: t.haloWarm }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0.45, 0.7] }}
          transition={{ duration: 4.5, ease: "easeInOut", delay: 0.8, repeat: Infinity, repeatType: "mirror" }}
        />

        {/* Logo container */}
        <motion.div
          className="relative"
          style={{ width: "min(540px, 74vw)", aspectRatio: "2171 / 1468" }}
          initial={{ opacity: 0, filter: "blur(32px)", scale: 0.86, y: 12 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
          transition={{ duration: 1.6, ease: EASE_CINEMA, delay: 0.25 }}
        >
          {/* Soft bloom layer */}
          <span
            aria-hidden="true"
            className="absolute inset-0 block blur-[22px]"
            style={{ ...logoMaskStyle(t.logoTone), opacity: 0.28 }}
          />
          {/* Core logo */}
          <span
            role="img"
            aria-label="وشّى"
            className="absolute inset-0 block"
            style={logoMaskStyle(t.logoTone, t.logoFilter)}
          />
          {/* Shimmer pass */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 block mix-blend-soft-light"
            style={{
              ...logoMaskStyle("transparent"),
              backgroundImage: "linear-gradient(108deg, transparent 14%, rgba(255,255,255,0) 38%, rgba(255,255,255,0.20) 49%, rgba(255,255,255,0.09) 57%, transparent 84%)",
              backgroundPosition: "180% 50%",
              backgroundSize: "280% 100%",
            }}
            initial={{ backgroundPosition: "180% 50%", opacity: 0 }}
            animate={{ backgroundPosition: ["180% 50%", "-90% 50%"], opacity: [0, 0.18, 0] }}
            transition={{ duration: 3.4, delay: 1.1, ease: EASE_EXPO_IN }}
          />
        </motion.div>

        {/* Under-rule */}
        <GoldLine delay={0.9} t={t} />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene: WORD (Brand Statement)
// ─────────────────────────────────────────────────────────────────

function SceneWord({ t }: { t: ThemeTokens }) {
  const arabic = "فنٌ يُرتدى";
  const chars = arabic.split("");

  return (
    <motion.div
      key="word"
      variants={sceneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex flex-col items-center justify-center gap-5"
    >
      {/* Top rule */}
      <GoldLine delay={0} t={t} />

      {/* Arabic headline — RTL stagger drop */}
      <motion.div
        className="overflow-hidden"
        dir="rtl"
      >
        <div className="flex items-center justify-center gap-[0.02em] leading-none">
          {chars.map((char, i) => (
            <motion.span
              key={i}
              className="font-arsenica font-bold inline-block"
              style={{
                fontSize: "clamp(3.2rem, 9vw, 5.5rem)",
                color: t.text,
                textShadow: `0 0 40px ${t.goldFaint}`,
              }}
              initial={{ y: -52, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.85,
                delay: 0.28 + i * 0.058,
                ease: EASE_CINEMA,
              }}
            >
              {char === " " ? " " : char}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Gold accent dot */}
      <motion.div
        className="rounded-full"
        style={{ width: 5, height: 5, backgroundColor: t.gold }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.55, ease: EASE_CINEMA }}
      />

      {/* English tagline — tracking compress */}
      <motion.p
        className="font-semibold uppercase"
        style={{
          fontSize: "clamp(0.7rem, 1.8vw, 0.95rem)",
          color: t.textMuted,
          letterSpacing: "0.9em",
        }}
        animate={{ letterSpacing: "0.48em", opacity: 1 }}
        initial={{ letterSpacing: "0.9em", opacity: 0 }}
        transition={{ duration: 1.8, delay: 0.65, ease: EASE_EXPO_IN }}
      >
        art you wear
      </motion.p>

      {/* Bottom rule */}
      <GoldLine delay={0.25} t={t} />

      {/* Floating Arabic verse — watermark */}
      <motion.p
        className="absolute font-arsenica pointer-events-none select-none text-center"
        style={{
          color: t.goldFaint,
          fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
          bottom: "12%",
          letterSpacing: "0.05em",
          opacity: 0,
        }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1.6, duration: 1.2 }}
      >
        يلبس الفن هويةً وهيبة
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene: CRAFT (Product Showcase)
// ─────────────────────────────────────────────────────────────────

function SceneCraft({ t }: { t: ThemeTokens }) {
  return (
    <motion.div
      key="craft"
      variants={sceneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex items-end justify-center overflow-hidden"
    >
      {/* Studio side light */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 45% 80% at 78% 50%, ${t.goldFaint}, transparent 65%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.0, ease: EASE_CINEMA, delay: 0.4 }}
      />

      {/* Product image — rises from below */}
      <motion.div
        className="relative"
        style={{ width: "min(400px, 62vw)", zIndex: 5 }}
        initial={{ y: 90, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: EASE_CINEMA, delay: 0.3 }}
      >
        <Image
          src="/mockups/hoodie-front.png"
          alt="WUSHA — الموسم الجديد"
          width={800}
          height={960}
          className="w-full h-auto object-contain"
          style={{ filter: t.productFilter }}
          priority
        />

        {/* Diagonal light sweep over product */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(122deg, transparent 28%, rgba(255,255,255,0.11) 50%, transparent 72%)",
            backgroundSize: "220% 100%",
          }}
          initial={{ backgroundPosition: "250% 0" }}
          animate={{ backgroundPosition: "-250% 0" }}
          transition={{ duration: 2.4, delay: 0.9, ease: EASE_EXPO_IN }}
        />
      </motion.div>

      {/* Left decorative vertical line */}
      <motion.div
        className="absolute left-[12%] sm:left-[18%]"
        style={{ top: "15%", width: 1, height: 0, background: t.lineGradV }}
        animate={{ height: "55vh" }}
        transition={{ duration: 1.4, ease: EASE_CINEMA, delay: 0.6 }}
      />

      {/* Season label — bottom-right */}
      <motion.div
        className="absolute right-8 sm:right-14 text-right"
        style={{ bottom: "18%", zIndex: 10 }}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.9, ease: EASE_CINEMA }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.28em]"
          style={{ color: t.textMuted }}
        >
          الموسم الجديد
        </p>
        <p
          className="font-display font-bold tracking-[0.15em] mt-0.5"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", color: t.gold }}
        >
          SS 26
        </p>
        <motion.div
          className="h-px mt-2"
          style={{ background: t.lineGrad }}
          initial={{ width: 0 }}
          animate={{ width: 48 }}
          transition={{ duration: 0.8, delay: 1.9 }}
        />
      </motion.div>

      {/* Craft label — top-left */}
      <motion.div
        className="absolute left-8 sm:left-14"
        style={{ top: "22%", zIndex: 10 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.6, duration: 0.9, ease: EASE_CINEMA }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: t.textMuted }}
        >
          الحرفة
        </p>
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.22em] mt-0.5"
          style={{ color: t.goldSoft }}
        >
          craft
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene: INTEL (WASHA AI)
// ─────────────────────────────────────────────────────────────────

function SceneIntel({ t }: { t: ThemeTokens }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 58 }, (_, i) => ({
        id:    i,
        left:  `${8 + ((i * 73.1) % 84)}%`,
        top:   `${8 + ((i * 59.3) % 84)}%`,
        size:  1.2 + (i % 4) * 0.6,
        delay: i * 0.030,
        dur:   3.2 + (i % 5) * 0.6,
      })),
    []
  );

  return (
    <motion.div
      key="intel"
      variants={sceneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* Aurora backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: t.aiGlow }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.72] }}
        transition={{ duration: 2.4, ease: EASE_CINEMA }}
      />

      {/* Breathing aurora pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: t.aiGlow }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity, delay: 2 }}
      />

      {/* Particle field */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left:            p.left,
              top:             p.top,
              width:           p.size,
              height:          p.size,
              backgroundColor: t.particleColor,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.75, 0.45, 0.80, 0.45],
              scale:   [0, 1, 0.82, 1.12, 0.90],
              x:       [0, -12, 9, -6, 0],
              y:       [0, -8,  12, -7, 0],
            }}
            transition={{
              duration:   p.dur,
              delay:      p.delay,
              ease:       "easeInOut",
              repeat:     Infinity,
              repeatType: "mirror",
            }}
          />
        ))}
      </div>

      {/* Core content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Top rule */}
        <GoldLine width="min(180px,30vw)" delay={0} t={t} />

        {/* WASHA AI logotype */}
        <motion.div
          className="font-display font-bold mt-7"
          style={{
            fontSize:   "clamp(3rem, 11vw, 6rem)",
            color:      t.text,
            letterSpacing: "0.06em",
            lineHeight: 1,
            textShadow: `0 0 60px ${t.goldGlow}`,
          }}
          initial={{ opacity: 0, y: 24, filter: "blur(18px)" }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
          transition={{ duration: 1.3, delay: 0.55, ease: EASE_CINEMA }}
        >
          WASHA AI
        </motion.div>

        {/* Sub label */}
        <motion.div
          className="flex items-center gap-3 mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.9 }}
        >
          <div className="h-px w-16" style={{ background: t.lineGrad }} />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.32em]"
            style={{ color: t.gold }}
          >
            ذكاء اصطناعي
          </span>
          <div className="h-px w-16" style={{ background: t.lineGrad }} />
        </motion.div>

        {/* Status pill */}
        <motion.div
          className="inline-flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full"
          style={{ border: `1px solid ${t.goldLine}` }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8, duration: 0.7, ease: EASE_CINEMA }}
        >
          <motion.div
            className="rounded-full"
            style={{ width: 6, height: 6, backgroundColor: t.gold }}
            animate={{ opacity: [1, 0.28, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ color: t.textMuted }}
          >
            متاح الآن
          </span>
        </motion.div>

        {/* Bottom rule */}
        <div className="mt-7">
          <GoldLine width="min(180px,30vw)" delay={0.3} t={t} />
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene: SEAL (Full Brand Lockup)
// ─────────────────────────────────────────────────────────────────

function SceneSeal({ t }: { t: ThemeTokens }) {
  return (
    <motion.div
      key="seal"
      variants={sceneVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* Kenburns slow zoom */}
      <motion.div
        className="flex flex-col items-center"
        animate={{ scale: [1, 1.028] }}
        transition={{ duration: 3.2, ease: "easeIn" }}
      >
        {/* Top rule */}
        <GoldLine delay={0} t={t} />

        {/* Logo */}
        <motion.div
          className="relative mt-7"
          style={{ width: "min(460px, 66vw)", aspectRatio: "2171 / 1468" }}
          initial={{ opacity: 0, filter: "blur(20px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: EASE_CINEMA, delay: 0.2 }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 block blur-[18px]"
            style={{ ...logoMaskStyle(t.logoTone), opacity: 0.22 }}
          />
          <span
            role="img"
            aria-label="وشّى"
            className="absolute inset-0 block"
            style={logoMaskStyle(t.logoTone, t.logoFilter)}
          />
        </motion.div>

        {/* Arabic tagline */}
        <motion.p
          className="font-arsenica font-bold mt-5"
          style={{ fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)", color: t.text }}
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
          transition={{ delay: 0.65, duration: 0.95, ease: EASE_CINEMA }}
        >
          فنٌ يُرتدى
        </motion.p>

        {/* English tagline */}
        <motion.p
          className="font-semibold uppercase tracking-[0.44em] mt-1.5"
          style={{ fontSize: "clamp(0.65rem, 1.5vw, 0.82rem)", color: t.textMuted }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.85 }}
        >
          art you wear
        </motion.p>

        {/* Bottom rule */}
        <div className="mt-7">
          <GoldLine delay={0.35} t={t} />
        </div>

        {/* Year badge */}
        <motion.p
          className="text-[9px] font-semibold uppercase tracking-[0.44em] mt-3"
          style={{ color: t.textMuted, opacity: 0 }}
          animate={{ opacity: 0.52 }}
          transition={{ delay: 1.4 }}
        >
          est. 2024
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Atmospheric Particles (always present)
// ─────────────────────────────────────────────────────────────────

function AtmosphericParticles({ t }: { t: ThemeTokens }) {
  const pts = useMemo(
    () => [
      { x: "16%", y: "24%", s: 1.6, d: 4.5, delay: 0.0  },
      { x: "80%", y: "32%", s: 1.1, d: 6.2, delay: 1.3  },
      { x: "48%", y: "72%", s: 2.0, d: 5.8, delay: 0.6  },
      { x: "65%", y: "16%", s: 1.3, d: 5.0, delay: 2.4  },
      { x: "28%", y: "58%", s: 1.7, d: 7.2, delay: 1.8  },
      { x: "88%", y: "76%", s: 1.0, d: 5.4, delay: 0.9  },
      { x: "10%", y: "82%", s: 1.4, d: 6.8, delay: 3.1  },
      { x: "72%", y: "52%", s: 1.2, d: 4.9, delay: 2.0  },
    ],
    []
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 3 }}
    >
      {pts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left:            p.x,
            top:             p.y,
            width:           p.s,
            height:          p.s,
            backgroundColor: t.gold,
          }}
          animate={{ opacity: [0.18, 0.62, 0.18], y: [0, -18, 0] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────────

function ProgressBar({ sceneIdx, t }: { sceneIdx: number; t: ThemeTokens }) {
  const duration = DURATIONS[SCENES[sceneIdx]];
  return (
    <motion.div
      key={sceneIdx}
      className="absolute bottom-0 left-0"
      style={{ height: 2, backgroundColor: t.gold, originX: 0 }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: duration / 1000 - 0.5, ease: "linear" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Scene Background (ambient shifts per scene)
// ─────────────────────────────────────────────────────────────────

const sceneBg: Record<SceneId, (t: ThemeTokens) => string> = {
  void:  (t) => `radial-gradient(ellipse 60% 55% at 50% 50%, ${t.goldFaint}, transparent 72%)`,
  mark:  (t) => `radial-gradient(ellipse 55% 60% at 50% 46%, ${t.goldFaint}, transparent 74%), ${t.haloWarm}`,
  word:  (t) => `radial-gradient(ellipse 50% 45% at 50% 50%, ${t.goldFaint}, transparent 68%)`,
  craft: (t) => `radial-gradient(ellipse 45% 80% at 76% 52%, ${t.goldFaint}, transparent 66%)`,
  intel: (t) => t.aiGlow,
  seal:  (t) => `radial-gradient(ellipse 60% 55% at 50% 50%, ${t.goldFaint}, transparent 72%)`,
};

// ─────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────

export function WashaFilmExperience() {
  const [theme,    setTheme]    = useState<Theme>("dark");
  const [sceneIdx, setSceneIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = T[theme];
  const currentScene = SCENES[sceneIdx];

  const advance = useCallback(() => {
    setSceneIdx((i) => (i + 1) % SCENES.length);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(advance, DURATIONS[currentScene]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sceneIdx, advance, currentScene]);

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: t.bg, zIndex: 0 }}
    >
      {/* ── Film grain ── */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:  GRAIN_URI,
          backgroundRepeat: "repeat",
          backgroundSize:   "256px 256px",
          opacity:          t.grainOpacity,
          zIndex:           999,
        }}
      />

      {/* ── Cinematic letterbox (dark version only) ── */}
      {t.letterbox && (
        <>
          <div className="absolute inset-x-0 top-0 h-[4.5vh] bg-black pointer-events-none" style={{ zIndex: 100 }} />
          <div className="absolute inset-x-0 bottom-0 h-[4.5vh] bg-black pointer-events-none" style={{ zIndex: 100 }} />
        </>
      )}

      {/* ── Ambient background ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: sceneBg[currentScene](t) }}
        animate={{ opacity: 1 }}
        key={currentScene + theme}
        initial={{ opacity: 0 }}
        transition={{ duration: 1.6, ease: EASE_CINEMA }}
      />

      {/* ── Atmospheric particles ── */}
      <AtmosphericParticles t={t} />

      {/* ── Scene renderer ── */}
      <AnimatePresence mode="wait">
        {currentScene === "void"  && <SceneVoid  key="void"  t={t} />}
        {currentScene === "mark"  && <SceneMark  key="mark"  t={t} />}
        {currentScene === "word"  && <SceneWord  key="word"  t={t} />}
        {currentScene === "craft" && <SceneCraft key="craft" t={t} />}
        {currentScene === "intel" && <SceneIntel key="intel" t={t} />}
        {currentScene === "seal"  && <SceneSeal  key="seal"  t={t} />}
      </AnimatePresence>

      {/* ── Progress bar ── */}
      <div className="absolute inset-x-0 bottom-0" style={{ zIndex: 60 }}>
        <ProgressBar sceneIdx={sceneIdx} t={t} />
      </div>

      {/* ── Top bar ── */}
      <div
        className="absolute inset-x-0 top-0 flex items-start justify-between pointer-events-none"
        style={{ padding: "clamp(1.25rem,3vh,2rem) clamp(1.25rem,3vw,2.5rem)", zIndex: 50 }}
      >
        <motion.span
          className="font-arsenica font-bold tracking-[0.3em]"
          style={{ fontSize: "clamp(0.85rem, 1.8vw, 1rem)", color: t.textMuted, opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.4, duration: 1.0 }}
        >
          وشّى
        </motion.span>
        <motion.span
          className="font-display font-semibold uppercase tracking-[0.35em]"
          style={{ fontSize: "clamp(0.58rem, 1.2vw, 0.72rem)", color: t.textMuted, opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 0.5, duration: 1.0 }}
        >
          brand film
        </motion.span>
      </div>

      {/* ── Bottom controls ── */}
      <div
        className="absolute inset-x-0 flex items-end justify-between"
        style={{
          bottom: t.letterbox ? "calc(4.5vh + 1.25rem)" : "1.25rem",
          padding: "0 clamp(1.25rem,3vw,2.5rem)",
          zIndex: 60,
        }}
      >
        {/* Scene dots */}
        <div className="flex items-center gap-2">
          {SCENES.map((s, i) => (
            <motion.button
              key={s}
              onClick={() => { setSceneIdx(i); }}
              aria-label={`مشهد ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                height:          5,
                backgroundColor: i === sceneIdx ? t.gold : t.goldLine,
              }}
              animate={{ width: i === sceneIdx ? 18 : 5 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-all duration-400 hover:opacity-90"
            style={{
              borderColor: t.goldLine,
              color:       t.text,
              fontSize:    "0.68rem",
              fontWeight:  600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span>{theme === "dark" ? "◑" : "◐"}</span>
            <span>{theme === "dark" ? "فاتح" : "داكن"}</span>
          </button>

          {/* Back link */}
          <Link
            href="/"
            className="font-semibold uppercase transition-opacity hover:opacity-90"
            style={{
              fontSize:      "0.62rem",
              letterSpacing: "0.28em",
              color:         t.textMuted,
            }}
          >
            ← رئيسية
          </Link>
        </div>
      </div>

      {/* ── Corner ornaments (dark only) ── */}
      {theme === "dark" && (
        <>
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top:         t.letterbox ? "calc(4.5vh + 16px)" : 16,
              left:        16,
              width:       20,
              height:      20,
              borderTop:   `1px solid ${t.goldLine}`,
              borderLeft:  `1px solid ${t.goldLine}`,
              zIndex:      55,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          />
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top:         t.letterbox ? "calc(4.5vh + 16px)" : 16,
              right:       16,
              width:       20,
              height:      20,
              borderTop:   `1px solid ${t.goldLine}`,
              borderRight: `1px solid ${t.goldLine}`,
              zIndex:      55,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          />
          <motion.div
            className="absolute pointer-events-none"
            style={{
              bottom:       t.letterbox ? "calc(4.5vh + 16px)" : 16,
              left:         16,
              width:        20,
              height:       20,
              borderBottom: `1px solid ${t.goldLine}`,
              borderLeft:   `1px solid ${t.goldLine}`,
              zIndex:       55,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          />
          <motion.div
            className="absolute pointer-events-none"
            style={{
              bottom:       t.letterbox ? "calc(4.5vh + 16px)" : 16,
              right:        16,
              width:        20,
              height:       20,
              borderBottom: `1px solid ${t.goldLine}`,
              borderRight:  `1px solid ${t.goldLine}`,
              zIndex:       55,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
          />
        </>
      )}
    </div>
  );
}
