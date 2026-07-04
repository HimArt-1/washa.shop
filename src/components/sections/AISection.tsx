"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { Sparkles, Wand2, Shirt, Stars, CheckCircle2 } from "lucide-react";
import Image from "next/image";

const steps = [
  {
    id: 1,
    title: "اختيار القطعة",
    desc: "ابدأ بخامة واضحة ومقاس مناسب قبل أي توليد بصري.",
    icon: Shirt,
  },
  {
    id: 2,
    title: "وصف الفكرة",
    desc: "اكتب المزاج، الألوان، والأسلوب الفني الذي تريده.",
    icon: Wand2,
  },
  {
    id: 3,
    title: "اعتماد النتيجة",
    desc: "شاهد التصميم على القطعة قبل متابعة الطلب.",
    icon: CheckCircle2,
  },
];

const wushaIntroMarkMaskStyle: CSSProperties = {
  WebkitMaskImage: "url('/header-logo-identity.png')",
  maskImage: "url('/header-logo-identity.png')",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

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
  const sectionRef = useRef<HTMLElement | null>(null);
  const sectionInView = useInView(sectionRef, { margin: "140px 0px" });
  const prefersReducedMotion = useReducedMotion();
  const motionEnabled = sectionInView && !prefersReducedMotion;
  const [activeStep, setActiveStep] = useState(1);
  const [promptText, setPromptText] = useState("");

  const fullPrompt = config?.step2_prompt || "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...";
  const defaultGarment = "/images/design/heavy-tshirt-black-front.svg";
  const rawGarment = config?.step1_image || defaultGarment;
  /** مسار قديم .png يعاد توجيهه في next.config إلى SVG. */
  const garmentImage =
    rawGarment === "/images/design/heavy-tshirt-black-front.png" ? defaultGarment : rawGarment;
  const garmentColorName = config?.step1_color_name || "أسود كلاسيك";
  const garmentPattern = config?.step1_pattern || "بدون نمط";
  const artStyle = config?.step2_art_style || "رسم رقمي";
  const resultImage = config?.step2_result_image || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80";
  const finalMockupImage = config?.step3_final_image || "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&q=80";

  useEffect(() => {
    if (!motionEnabled) return;

    let timeoutId: NodeJS.Timeout;

    if (activeStep === 1) {
      timeoutId = setTimeout(() => setActiveStep(2), 4000);
    } else if (activeStep === 2) {
      timeoutId = setTimeout(() => setActiveStep(3), 4800);
    } else {
      timeoutId = setTimeout(() => {
        setActiveStep(1);
        setPromptText("");
      }, 6800);
    }

    return () => clearTimeout(timeoutId);
  }, [activeStep, motionEnabled]);

  useEffect(() => {
    if (!motionEnabled || activeStep !== 2) {
      setPromptText("");
      return;
    }

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullPrompt.length) {
        setPromptText(fullPrompt.slice(0, currentIndex));
        currentIndex += 1;
      } else {
        clearInterval(typingInterval);
      }
    }, 42);

    return () => clearInterval(typingInterval);
  }, [activeStep, fullPrompt, motionEnabled]);

  return (
    <section ref={sectionRef} id="ai-design-section" className="home-flow-section home-flow-section--ai">
      <div className="home-section-smoke" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="container-wusha relative z-10">
        <div className="home-ai-stack">
          <motion.div
            className="home-ai-head"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="home-section-title">صممها بنفسك</h2>
          </motion.div>

          <motion.div
            className="home-stage-shell home-stage-shell--full"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="home-stage-core p-4 sm:p-5 lg:p-6">
              <div className="grid min-h-[34rem] gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:gap-5">
                <div className="flex flex-col gap-3">
                  {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = activeStep === step.id;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStep(step.id)}
                        className="home-step-button"
                        data-active={isActive}
                      >
                        <span className="home-step-icon">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-1 flex items-center gap-2">
                            <span className="text-[0.68rem] font-black text-theme-faint">
                              {String(step.id).padStart(2, "0")}
                            </span>
                            <span className="text-base font-black text-theme-strong">
                              {step.title}
                            </span>
                          </span>
                          <span className="block text-sm leading-7 text-theme-subtle">
                            {step.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}

                </div>

                <div className="home-ai-visual">
                  <div className="home-ai-grid" aria-hidden />
                  <div className="home-ai-corner home-ai-corner--top" aria-hidden />
                  <div className="home-ai-corner home-ai-corner--bottom" aria-hidden />

                  <AnimatePresence mode="wait">
                    {activeStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -18, scale: 1.02 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative flex h-full min-h-[28rem] flex-col items-center justify-center p-5"
                      >
                        <motion.div
                          className="relative h-60 w-60 sm:h-72 sm:w-72 lg:h-80 lg:w-80"
                          animate={motionEnabled ? { y: [0, -10, 0], scale: [1, 1.035, 1] } : undefined}
                          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Image
                            src={garmentImage}
                            alt="قطعة الملابس المختارة"
                            fill
                            className="object-contain drop-shadow-[0_28px_58px_rgba(0,0,0,0.26)]"
                            sizes="(max-width: 640px) 240px, (max-width: 1024px) 288px, 320px"
                            unoptimized={garmentImage.endsWith(".svg")}
                          />
                        </motion.div>

                        <div className="home-ai-chip-set">
                          <span className="home-ai-chip">
                            <span className="h-3 w-3 rounded-full border border-white/20 bg-black" />
                            {garmentColorName}
                          </span>
                          <span className="home-ai-chip">
                            <Shirt className="h-3.5 w-3.5" aria-hidden />
                            {garmentPattern}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -18, scale: 0.98 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative flex h-full min-h-[28rem] flex-col items-center justify-center p-4 sm:p-6"
                      >
                        <div className="home-ai-prompt-card">
                          <div className="flex items-start gap-3">
                            <span className="home-ai-prompt-icon">
                              <Stars className="h-4 w-4" aria-hidden />
                            </span>
                            <p className="min-h-[4.5rem] flex-1 text-sm font-semibold leading-8 text-theme-strong sm:text-base">
                              {promptText}
                              <motion.span
                                animate={motionEnabled ? { opacity: [1, 0] } : { opacity: 1 }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                                className="mr-1 inline-block h-4 w-1 rounded-full bg-gold align-middle"
                              />
                            </p>
                          </div>
                        </div>

                        <div className="my-5 flex items-center gap-3">
                          <span className="text-xs font-bold text-theme-faint">الأسلوب</span>
                          <span className="home-ai-style-badge">{artStyle}</span>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 26, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: promptText.length === fullPrompt.length ? 1 : 0.96 }}
                          transition={{ duration: 0.6, type: "spring", bounce: 0.32 }}
                          className="home-ai-image-frame h-44 w-44 sm:h-56 sm:w-56"
                        >
                          {promptText.length === fullPrompt.length ? (
                            <>
                              <Image
                                src={resultImage}
                                alt="نتيجة التصميم المولدة"
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 176px, 224px"
                              />
                              <span className="home-ai-image-tag">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                أصلي
                              </span>
                            </>
                          ) : (
                            <div className="home-ai-generating">
                              <Sparkles className="h-5 w-5" aria-hidden />
                              <span>جاري بناء المعاينة</span>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    )}

                    {activeStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 18, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.04 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="relative flex h-full min-h-[28rem] flex-col items-center justify-center p-4 sm:p-6"
                      >
                        <motion.div
                          className="home-ai-image-frame h-[22rem] w-full max-w-md"
                          animate={motionEnabled ? { y: [0, -8, 0] } : undefined}
                          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Image
                            src={finalMockupImage}
                            alt="معاينة التصميم النهائي على المنتج"
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) calc(100vw - 64px), 448px"
                          />
                        </motion.div>

                        <div className="home-ai-status-strip">
                          <span
                            aria-hidden
                            className="block h-5 w-6 shrink-0 bg-current text-gold"
                            style={wushaIntroMarkMaskStyle}
                          />
                          <span>المعاينة جاهزة للطلب</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
