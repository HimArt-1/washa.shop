"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, Shirt, Stars, CheckCircle2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const steps = [
  {
    id: 1,
    title: "اختيار القطعة",
    desc: "اختر الكانفاس المثالي لتصميمك",
    icon: Shirt,
  },
  {
    id: 2,
    title: "إلهام الذكاء الاصطناعي",
    desc: "صف خيالك، وسنحوله إلى لوحة",
    icon: Wand2,
  },
  {
    id: 3,
    title: "تحفتك جاهزة",
    desc: "تصميمك مطبوع بدقة وبجودة عالية",
    icon: CheckCircle2,
  },
];

interface AISectionProps {
  config?: {
    step1_image?: string;
    step1_color_name?: string;
    step1_pattern?: string;
    step2_prompt?: string;
    step2_art_style?: string;
    step2_result_image?: string;
    step3_final_image?: string;
  };
}

export function AISection({ config }: AISectionProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [particles, setParticles] = useState<Array<{ id: number; top: number; left: number; duration: number; delay: number }>>([]);
  const [promptText, setPromptText] = useState("");

  const fullPrompt = config?.step2_prompt || "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...";
  const defaultGarment = "/images/design/heavy-tshirt-black-front.svg";
  const rawGarment = config?.step1_image || defaultGarment;
  /** مسار قديم .png — يُعاد توجيهه في next.config إلى الـ SVG */
  const garmentImage =
    rawGarment === "/images/design/heavy-tshirt-black-front.png" ? defaultGarment : rawGarment;
  const garmentColorName = config?.step1_color_name || "أسود كلاسيك";
  const garmentPattern = config?.step1_pattern || "بدون نمط";
  const artStyle = config?.step2_art_style || "رسم رقمي (Digital Art)";
  const resultImage = config?.step2_result_image || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80";
  const finalMockupImage = config?.step3_final_image || "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80";

  // Auto-play logic with variable timing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (activeStep === 1) {
      timeoutId = setTimeout(() => setActiveStep(2), 4000);
    } else if (activeStep === 2) {
      timeoutId = setTimeout(() => setActiveStep(3), 4000);
    } else if (activeStep === 3) {
      timeoutId = setTimeout(() => {
        setActiveStep(1);
        setPromptText("");
      }, 7000); // give step 3 more time (7 seconds)
    }

    return () => clearTimeout(timeoutId);
  }, [activeStep]);

  // Typing effect for step 2
  useEffect(() => {
    if (activeStep !== 2) {
      setPromptText("");
      return;
    }
    
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullPrompt.length) {
        setPromptText(fullPrompt.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [activeStep]);

  // Particles
  useEffect(() => {
    setParticles(
      [...Array(15)].map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 2,
      }))
    );
  }, []);

  return (
    <section className="py-16 sm:py-28 relative overflow-hidden" id="ai-design-section">
      {/* Section Divider */}
      <div className="gold-separator mb-16 sm:mb-28 mx-8 sm:mx-auto sm:max-w-2xl" />

      {/* Background */}
      <div className="absolute inset-0 bg-theme-gradient" />
      <div className="absolute inset-0 cyber-grid opacity-30" />

      {/* Gold Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gold"
            style={{
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              width: particle.id % 3 === 0 ? "3px" : particle.id % 3 === 1 ? "2px" : "1px",
              height: particle.id % 3 === 0 ? "3px" : particle.id % 3 === 1 ? "2px" : "1px",
            }}
            animate={{
              opacity: [0.1, 0.6, 0.1],
              y: [0, -20, 0],
              scale: [1, 1.8, 1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="container-wusha relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-gold/50" />
            <Sparkles className="w-3.5 h-3.5 text-gold/70" />
            <span className="text-xs font-semibold text-gold/60 tracking-[0.35em] uppercase">
              صممها بنفسك
            </span>
            <Sparkles className="w-3.5 h-3.5 text-gold/70" />
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
            <span className="text-gradient font-display">صمّم قطعتك</span>
            <br />
            <span className="text-theme-strong text-3xl md:text-4xl lg:text-5xl font-bold">بالذكاء الاصطناعي</span>
          </h2>
          <p className="prose-readable text-theme-subtle mx-auto max-w-xl text-base sm:text-lg">
            من الخيال إلى قطعة ترتديها — رحلة إبداعية في ثلاث خطوات
          </p>
        </motion.div>

        {/* Interactive Interactive Carousel */}
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          
          {/* Stepper Navigation */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`relative flex items-start text-right gap-4 p-4 rounded-2xl transition-all duration-500 border ${
                    isActive
                      ? "border-gold/30 shadow-[0_0_30px_rgba(202,160,82,0.12)]"
                      : "glass-card border-transparent hover:border-theme-soft opacity-55 hover:opacity-90"
                  }`}
                  style={isActive ? {
                    background: "var(--ai-step-active-bg)",
                  } : {}}
                >
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-gradient-to-b from-transparent via-gold to-transparent" />
                  )}
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${isActive ? "bg-gold text-[#111] shadow-[0_4px_16px_rgba(202,160,82,0.4)]" : "bg-theme-subtle text-theme-subtle"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold tracking-widest ${isActive ? "text-gold/60" : "text-theme-faint"}`}>
                        {String(step.id).padStart(2, "0")}
                      </span>
                      <h3 className={`font-bold transition-colors ${isActive ? "text-gold" : "text-theme-strong"}`}>
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-theme-subtle leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </button>
              );
            })}

            <div className="hidden lg:block mt-6">
              <Link
                href="/design"
                className="btn-gold w-full flex items-center justify-center gap-2 py-4 rounded-xl group"
              >
                <span>ابدأ رحلة التصميم الآن</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Visual Simulation Stage */}
          <div className="w-full lg:w-2/3 aspect-[4/3] sm:aspect-[16/10] premium-card rounded-[2rem] overflow-hidden relative flex items-center justify-center p-6 sm:p-12">
            <AnimatePresence mode="wait">
              {/* STEP 1: Garment Selection */}
              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center relative w-full h-full"
                >
                  <motion.div 
                    initial={{ scale: 1 }}
                    animate={{ scale: 1.15 }}
                    transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                    className="relative w-48 h-48 sm:w-64 sm:h-64 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                  >
                    <Image
                      src={garmentImage}
                      alt="Garment"
                      fill
                      className="object-contain"
                      priority
                      unoptimized={garmentImage.endsWith(".svg")}
                    />
                  </motion.div>
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap justify-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/4 sm:flex-col sm:items-stretch">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="glass-card px-4 py-2 rounded-2xl border-gold/30 flex items-center gap-2"
                    >
                       <div className="w-3 h-3 rounded-full bg-black border border-white/20" />
                       <span className="text-xs font-bold text-theme-strong">{garmentColorName}</span>
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                      className="glass-card px-4 py-2 rounded-2xl border-gold/30 flex items-center gap-2"
                    >
                       <Shirt className="w-3 h-3 text-theme-subtle" />
                       <span className="text-xs font-bold text-theme-strong">{garmentPattern}</span>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: AI Inspiration */}
              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="w-full max-w-lg mx-auto flex flex-col items-center"
                >
                   <div className="w-full glass-card border-gold/30 rounded-2xl p-4 sm:p-6 shadow-lg mb-4 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                          <Stars className="w-4 h-4 text-gold" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm sm:text-base text-theme-strong min-h-[48px] font-medium leading-relaxed">
                            {promptText}
                            <motion.span 
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                              className="inline-block w-1.5 h-4 ml-1 bg-gold align-middle"
                            />
                          </p>
                        </div>
                      </div>
                   </div>

                   {/* Art Style Badge */}
                   <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-3 mb-6"
                   >
                     <span className="text-xs text-theme-subtle">الأسلوب:</span>
                     <div className="glass-card px-3 py-1.5 rounded-full border-gold/30 text-xs font-bold text-gold">
                       {artStyle}
                     </div>
                   </motion.div>

                   {/* Generated Result Pop */}
                   <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={promptText.length === fullPrompt.length ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 30 }}
                      transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                      className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-2xl overflow-hidden glass-card p-2 border-gold/40 shadow-[0_0_40px_rgba(202,160,82,0.2)] mt-4"
                   >
                     <motion.div 
                        initial={{ scale: 1 }}
                        animate={{ scale: 1.1 }}
                        transition={{ duration: 6, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                        className="relative w-full h-full rounded-xl overflow-hidden"
                     >
                       <Image
                         src={resultImage}
                         alt="AI Generated Result"
                         fill
                         className="object-cover"
                       />
                     </motion.div>
                     <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                       <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                       <span className="text-[10px] text-white">100% أصلي</span>
                     </div>
                   </motion.div>
                </motion.div>
              )}

              {/* STEP 3: Final Product Merged */}
              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col items-center justify-center relative w-full h-full"
                >
                  <motion.div 
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 4, ease: "easeOut" }}
                    className="relative w-[85%] h-[85%] sm:w-80 sm:h-80 md:w-96 md:h-96 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden glass-card p-2 border-gold/20"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-full h-full relative rounded-xl overflow-hidden"
                    >
                      <Image
                        src={finalMockupImage}
                        alt="Final Design Mockup"
                        fill
                        className="object-cover"
                        priority
                      />
                    </motion.div>
                  </motion.div>
                  
                  {/* Floating celebration tag */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="absolute inset-x-4 bottom-4 mx-auto flex max-w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-[1.5rem] border-gold/40 px-4 py-3 text-center shadow-[0_0_30px_rgba(202,160,82,0.3)] glass-card sm:inset-x-auto sm:bottom-12 sm:max-w-none sm:px-6"
                  >
                    <Sparkles className="w-5 h-5 text-gold" />
                    <span className="font-bold text-theme-strong text-sm sm:text-base">تحفتك الفنية جاهزة للإرتداء!</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Mobile CTA */}
          <div className="lg:hidden w-full mt-2">
            <Link
              href="/design"
              className="btn-gold w-full flex items-center justify-center gap-2 py-4 rounded-xl group"
            >
              <span>ابدأ رحلة التصميم الآن</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Section Bottom Ornament */}
          <div className="w-full mt-6 lg:mt-10 flex items-center justify-center gap-4 opacity-40">
            <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent to-gold/30" />
            <Sparkles className="w-3 h-3 text-gold/50" />
            <div className="h-px flex-1 max-w-xs bg-gradient-to-l from-transparent to-gold/30" />
          </div>
        </div>
      </div>
    </section>
  );
}
