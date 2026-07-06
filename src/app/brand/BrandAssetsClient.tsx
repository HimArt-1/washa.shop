"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  Globe,
  Droplets, 
  Wind, 
  Sparkles,
  Thermometer,
  ShieldAlert,
  Shirt,
  Download,
  Instagram
} from "lucide-react";
import { toPng } from "html-to-image";

const BRAND_MARK_SRC = "/header-logo-identity.png";
const BRAND_WORDMARK_SRC = "/hero-logo-wordmark.png";
const NOISE_TEXTURE =
  "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.36), transparent 22%), radial-gradient(circle at 82% 78%, rgba(0,0,0,0.12), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.12), rgba(0,0,0,0.06))";
const BRAND_MARK_SHADOW =
  "drop-shadow(0 0 14px var(--brand-mark-glow)) drop-shadow(0 14px 30px var(--brand-shadow-tint))";

type BrandConfig = Record<string, unknown>;
type CardTone = "light" | "dark";
type DownloadHandler = (elementId: string, filename: string) => void | Promise<void>;

const IMPORT_LIGHT_EXPORT_BG =
  "linear-gradient(135deg,#fff8ed 0%,#f5ecdd 58%,#dfc6af 100%)";
const IMPORT_DARK_EXPORT_BG =
  "linear-gradient(135deg,#432b2b 0%,#2a1a19 54%,#130d0c 100%)";

function asRecord(value: unknown): BrandConfig {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as BrandConfig)
    : {};
}

function readString(source: unknown, key: string) {
  const value = asRecord(source)[key];
  return typeof value === "string" ? value : "";
}

function readNestedRecord(source: unknown, key: string) {
  return asRecord(asRecord(source)[key]);
}

function getText(source: unknown, key: string, fallback: string) {
  const value = readString(source, key).trim();
  return value.length > 0 ? value : fallback;
}

function isVisible(source: unknown, key: string) {
  return asRecord(source)[key] !== false;
}

function getBrandCopy(config: unknown) {
  const nestedBrandAssets = readNestedRecord(config, "brand_assets");
  const businessCardWebsite =
    getText(config, "business_card_website", "") ||
    getText(nestedBrandAssets, "business_card_website", "www.washa.shop");

  return {
    businessCardName: getText(config, "business_card_name", "هشام الزهراني"),
    businessCardTitle: getText(config, "business_card_title", "المدير التنفيذي"),
    businessCardPhone: getText(config, "business_card_phone", "+966 53 223 5005"),
    businessCardEmail: getText(config, "business_card_email", "washaksa@hotmail.com"),
    businessCardWebsite,
    thankYouTitle: getText(config, "thank_you_title", "شكراً لثقتكم"),
    thankYouMessage: getText(
      config,
      "thank_you_message",
      "نحن في وشّى نصنع الفن بحب وإتقان،\nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالنا شغف صنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا."
    ),
    thankYouHandle: getText(config, "thank_you_handle", "@washha.sa"),
    linktreeTitle: getText(config, "linktree_title", "وشّى منصة الفن"),
    linktreeSubtitle: getText(config, "linktree_subtitle", "الإبداع بين يديك"),
  };
}

function BrandMark({
  className = "",
  toneColor = "var(--brand-card-mark)",
}: {
  className?: string;
  toneColor?: string;
}) {
  return (
    <span
      role="img"
      aria-label="وشّى"
      className={`block shrink-0 select-none ${className}`}
      style={{
        backgroundColor: toneColor,
        WebkitMaskImage: `url(${BRAND_MARK_SRC})`,
        maskImage: `url(${BRAND_MARK_SRC})`,
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        filter: BRAND_MARK_SHADOW,
      }}
    />
  );
}

function BrandWordmark({
  className = "",
  toneColor = "var(--brand-card-mark)",
}: {
  className?: string;
  toneColor?: string;
}) {
  return (
    <span
      role="img"
      aria-label="وشّى"
      className={`block shrink-0 select-none ${className}`}
      style={{
        backgroundColor: toneColor,
        WebkitMaskImage: `url(${BRAND_WORDMARK_SRC})`,
        maskImage: `url(${BRAND_WORDMARK_SRC})`,
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function TextureLayer({ className = "" }: { className?: string }) {
  return (
    <div
      data-export-hide="true"
      className={`absolute inset-0 pointer-events-none mix-blend-overlay ${className}`}
      style={{ backgroundImage: NOISE_TEXTURE }}
    />
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.98a8.18 8.18 0 0 0 4.76 1.52V7.05a4.84 4.84 0 0 1-1-.36z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.124 0c-1.397.025-3.027.601-3.951 1.636-.78.88-.707 2.072-.663 3.123.018.497.042 1.054-.108 1.488-.13.374-.326.541-.53.69-.328.24-.707.306-1.127.35-.38.038-.802.055-1.125.32-.239.197-.433.486-.531.815-.098.33-.039.69.213 1.01.217.282.516.48.868.647l.116.035c.264.12.56.242.8.448.242.203.456.492.656.848.33.606.671.865.986.97.039 0 .092.016.14.016.3 0 .633-.066.883-.186l.01-.005c.162-.07.332-.142.493-.198.242-.1.49-.18.736-.243.262-.128.528-.21.821-.21h.001c.294 0 .56.082.822.21.246.063.494.143.736.243.16.056.331.128.494.198l.01.005c.25.12.582.186.882.186.048 0 .101-.016.14-.016.315-.105.656-.364.986-.97.2-.356.414-.645.656-.848.24-.206.536-.328.8-.448l.117-.035c.351-.167.65-.365.867-.647.252-.32.311-.68.213-1.01-.098-.329-.292-.618-.531-.815-.323-.265-.745-.282-1.125-.32-.42-.044-.799-.11-1.127-.35-.205-.15-.401-.316-.53-.69-.15-.434-.125-.991-.107-1.488.043-1.051.116-2.243-.664-3.123C15.151.6 13.521.024 12.124 0zm-1.898 14.885c-.25 0-.583.076-.89.206-.188.083-.388.188-.59.298l-.02.012c-.443.25-.826.41-1.107.41h-.033c-.44 0-.854-.253-.889-.276l-.039-.028c-.167-.105-.33-.2-.516-.296-.28-.153-.49-.228-.59-.228-.052.014-.15.068-.225 0-.071-.065-.008-.182.02-.236l.015-.027c.606-.826 1.54-.959 1.948-.992.115 0 .227-.014.33-.014.623 0 1.25.26 1.705.808.204.24.417.41.652.514.225.097.466.142.697.142.233 0 .473-.045.698-.142.235-.104.448-.274.652-.514.455-.548 1.082-.808 1.705-.808.103 0 .215.014.33.014.408.033 1.341.166 1.947.992l.016.027c.027.054.09.171.019.236-.075.068-.173.014-.224 0-.1-.001-.312.074-.591.228-.186.095-.349.19-.517.296l-.038.028c-.035.023-.45.276-.89.276h-.032c-.282 0-.665-.16-1.107-.41l-.02-.012c-.201-.11-.402-.215-.59-.298-.306-.13-.64-.206-.89-.206z"/>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function BrandAssetsClient({ config }: { config: any }) {
  const brandCopy = getBrandCopy(config);
  const socialCardWebsite = brandCopy.businessCardWebsite
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "www.");

  const handleDownload = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Detect dark mode
    const computedStyle = window.getComputedStyle(element);
    const explicitBg = element.getAttribute("data-export-bg");
    const captureBg = computedStyle.getPropertyValue("--brand-card-capture-bg").trim();
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const solidBg = explicitBg || captureBg || (isDark
      ? "linear-gradient(135deg, #2a1b18 0%, #130b0c 100%)"
      : "linear-gradient(135deg, #fff8f2 0%, #f0dfd2 100%)");

    // Save originals
    const origBg = element.style.background;
    const origBackdrop = element.style.backdropFilter;
    const origWebkitBackdrop = element.style.getPropertyValue("-webkit-backdrop-filter");

    // Find and temporarily hide all external texture overlays & blur glows inside this element
    const textureOverlays = element.querySelectorAll<HTMLElement>(
      "[class*='bg-\\[url']"
    );
    const blurGlows = element.querySelectorAll<HTMLElement>(
      "[class*='blur-']"
    );
    const exportHidden = element.querySelectorAll<HTMLElement>(
      "[data-export-hide='true']"
    );
    const hiddenDecor = Array.from(
      new Set<HTMLElement>([
        ...Array.from(textureOverlays),
        ...Array.from(blurGlows),
        ...Array.from(exportHidden),
      ])
    );

    // Apply solid background for capture (backdrop-filter not supported by html-to-image)
    element.style.background = solidBg;
    element.style.backdropFilter = "none";
    element.style.setProperty("-webkit-backdrop-filter", "none");

    // Hide texture overlays (CORS issue with external URLs)
    // Hide texture/glow decorations that do not export cleanly in html-to-image.
    hiddenDecor.forEach((el) => (el.style.display = "none"));

    try {
      await document.fonts.ready;
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 4, // Ultra high quality for print
        style: {
          transform: "none",
          transition: "none",
          boxShadow: "none",
        },
      });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to capture image:", err);
    } finally {
      // Restore everything
      element.style.background = origBg;
      element.style.backdropFilter = origBackdrop;
      element.style.setProperty("-webkit-backdrop-filter", origWebkitBackdrop);
      hiddenDecor.forEach((el) => (el.style.display = ""));
    }
  };

  return (
    <div className="brand-assets-page relative min-h-screen overflow-hidden bg-bg pt-24 pb-32 selection:bg-[var(--brand-card-accent-soft)] selection:text-[var(--brand-card-ink)]">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 cyber-grid opacity-[0.05]" />
        <div className="absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-[var(--brand-card-accent-soft)] blur-[150px] mix-blend-multiply opacity-80 dark:mix-blend-screen dark:opacity-30" />
        <div className="absolute bottom-[-18%] left-[-8%] h-[620px] w-[620px] rounded-full bg-[var(--brand-card-faint)] blur-[150px] mix-blend-multiply opacity-70 dark:mix-blend-screen dark:opacity-40" />
        <TextureLayer className="opacity-[0.024] dark:opacity-[0.04]" />
      </div>

      <div className="container-wusha relative z-10 max-w-6xl mx-auto">

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto mb-20 max-w-4xl text-center md:mb-32"
        >
          <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-[var(--brand-card-border)] bg-[var(--brand-card-chip-bg)] shadow-[var(--brand-card-shadow)] backdrop-blur-xl">
            <BrandMark className="h-[70px] w-[80px]" toneColor="var(--brand-card-mark)" />
          </div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-card-border)] bg-[var(--brand-card-chip-bg)] px-4 py-2 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 brand-icon" />
            <span className="brand-accent text-sm font-medium tracking-widest uppercase">التصاميم والهوية</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-theme-strong md:text-6xl lg:text-7xl">
            هوية وشّى المطبوعة
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-theme-subtle md:text-xl">
            لأن التفاصيل تصنع الفارق.. نستعرض هنا مجموعة التصاميم الورقية الفاخرة التي تمثل جزءاً من تجربة عملاء وشّى المُميزة.
          </p>
        </motion.div>

        {/* 1. Business Card Showcase */}
        <div className="mb-32 md:mb-48">
          <SectionTitle title="بطاقة العمل" subtitle="Business Card" number="01" />
          
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* The Cards Container (Perspective wrapper) */}
            <div className="w-full lg:w-3/5 perspective-1000 flex flex-col md:flex-row gap-6 md:gap-8 justify-center items-center">
              
              {/* Back of Card (Left / Top) */}
              <motion.div 
                initial={{ opacity: 0, x: -50, rotateY: -15, rotateZ: -5 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 10, rotateZ: -5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ scale: 1.05, rotateY: 0, rotateZ: 0, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="brand-business-card-frame relative w-full max-w-[400px] aspect-[1.65/1] group cursor-pointer"
              >
                <div
                  id="business-card-back"
                  className="brand-card w-full h-full rounded-[1.6rem] border overflow-hidden relative transition-all duration-700 ring-1 ring-white/10"
                >
                  {/* Subtle Top Glow */}
                  <div className="brand-card-glow absolute top-0 right-0 w-40 h-24 blur-[50px] z-0 rounded-full" />
                  {/* Grainy Texture */}
                  <TextureLayer className="opacity-[0.035] dark:opacity-[0.055]" />

                  <div className="h-full flex flex-col justify-between p-6 sm:px-8 sm:py-6 relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="brand-strong text-2xl font-bold mb-1">{brandCopy.businessCardName}</h2>
                        <p className="brand-accent text-sm font-medium tracking-wide">{brandCopy.businessCardTitle}</p>
                      </div>
                      <BrandMark className="h-[42px] w-[48px]" />
                    </div>
                    
                    <div className="space-y-1 sm:space-y-1.5 mt-2 mb-1 w-full">
                      <div className="brand-muted flex items-center gap-3 text-xs sm:text-sm w-full">
                        <Phone className="w-4 h-4 brand-icon flex-shrink-0" />
                        <span dir="ltr" className="tracking-wider px-1 pb-1 inline-block truncate min-w-0">{brandCopy.businessCardPhone}</span>
                      </div>
                      <div className="brand-muted flex items-center gap-3 text-xs sm:text-sm w-full">
                        <Mail className="w-4 h-4 brand-icon flex-shrink-0" />
                        <span dir="ltr" className="px-1 pb-1 inline-block truncate min-w-0">{brandCopy.businessCardEmail}</span>
                      </div>
                      <div className="brand-muted flex items-center gap-3 text-xs sm:text-sm w-full">
                        <Globe className="w-4 h-4 brand-icon flex-shrink-0" />
                        <span dir="ltr" className="px-1 pb-1.5 inline-block truncate min-w-0 text-left leading-relaxed">{brandCopy.businessCardWebsite}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Front of Card (Right / Bottom) */}
              <motion.div 
                initial={{ opacity: 0, x: 50, rotateY: 15, rotateZ: 5 }}
                whileInView={{ opacity: 1, x: 0, rotateY: -10, rotateZ: 5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ scale: 1.05, rotateY: 0, rotateZ: 0, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
                className="brand-business-card-frame relative w-full max-w-[400px] aspect-[1.65/1] group cursor-pointer"
              >
                <div
                  id="business-card-front"
                  className="brand-card w-full h-full rounded-[1.6rem] border overflow-hidden flex items-center justify-center relative transition-all duration-700 ring-1 ring-white/10"
                >
                  {/* Subtle Center Glow */}
                  <div className="brand-card-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-[60px] z-0 rounded-full" />
                  {/* Grainy Texture */}
                  <TextureLayer className="opacity-[0.035] dark:opacity-[0.055]" />
                  {/* Spot UV shine sweep on hover */}
                  <div className="absolute -inset-1/2 -rotate-45 translate-x-[-150%] bg-gradient-to-r from-transparent via-[var(--brand-card-accent-soft)] to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%]" />

                  <BrandMark className="relative z-10 h-[96px] w-[110px] sm:h-[112px] sm:w-[128px]" />
                </div>
              </motion.div>
            </div>

            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">انعكاس الهوية</h3>
              <p className="text-theme-subtle leading-loose">
                صُممت بطاقة العمل لتعكس فلسفة "وشّى" بمزج الأناقة الكلاسيكية بالتقنية الحديثة. يرمز لون الهوية العميق #4b3434 للثبات والفخامة، في حين يبرز الشعار الجديد كبصمة هادئة وواضحة، مع معلومات الاتصال المنسقة بعناية لسهولة الوصول.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <span className="brand-chip brand-muted rounded-lg border px-3 py-1 text-xs font-semibold">التشطيب: ختم الهوية البارز</span>
                <span className="brand-chip brand-muted rounded-lg border px-3 py-1 text-xs font-semibold">الورق: عاجي دافئ مطفي 600 جرام</span>
              </div>
              <div className="brand-divider flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <DownloadButton
                  onClick={() => handleDownload("business-card-back", "wusha-business-card-back")}
                  className="flex-1"
                >
                  حفظ الوجه الخلفي (معلومات)
                </DownloadButton>
                <DownloadButton
                  onClick={() => handleDownload("business-card-front", "wusha-business-card-front")}
                  className="flex-1"
                >
                  حفظ الوجه الأمامي (الشعار)
                </DownloadButton>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Thank You Card */}
        <div className="mb-32 md:mb-48">
          <SectionTitle title="بطاقة الشكر" subtitle="Thank You Card" number="02" align="right" />
          
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">تقدير لكل عميل</h3>
              <p className="text-theme-subtle leading-loose">
                بطاقة شخصية تُرفق مع كل طلب، نعبر فيها عن امتنانا الصادق لثقة العميل بنا. التصميم عمودي أنيق يُشبه رسائل الدعوات الفاخرة، مع رسالة مميزة تجعل من تجربة فتح الصندوق (Unboxing) لحظة لا تُنسى.
              </p>
              <div className="brand-divider pt-4 border-t">
                <DownloadButton
                  onClick={() => handleDownload("thank-you-card", "wusha-thank-you-card")}
                  className="w-full"
                >
                  حفظ بطاقة الشكر (جودة عالية)
                </DownloadButton>
              </div>
            </div>

            <div className="w-full lg:w-3/5 flex justify-center perspective-1000">
              <motion.div 
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px -15px rgba(75,52,52,0.18)" }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[320px] aspect-[1/1.4]"
              >
                <div
                  id="thank-you-card"
                  className="brand-card w-full h-full rounded-[1.7rem] p-6 sm:p-7 border flex flex-col items-center text-center overflow-hidden relative transition-all duration-700 ring-1 ring-white/10"
                >
                  {/* Subtle Top Glow */}
                  <div className="brand-card-glow absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 blur-[50px] z-0 rounded-full" />
                  {/* Grainy Texture */}
                  <TextureLayer className="opacity-[0.035] dark:opacity-[0.055]" />

                  <BrandMark className="relative z-10 mb-6 h-[46px] w-[52px]" />

                  <div className="flex-1 min-h-0 flex flex-col justify-center relative z-10 w-full text-center">
                    <h3 className="brand-card-title-ghadim brand-strong text-2xl mb-4">{brandCopy.thankYouTitle}</h3>
                    <div className="brand-muted text-[12px] leading-6 mb-5 whitespace-pre-line px-1">
                      {brandCopy.thankYouMessage}
                    </div>
                  </div>

                  <div className="brand-divider w-full flex items-center justify-center mt-auto pt-4 border-t relative z-10">
                    <span
                      dir="ltr"
                      className="brand-link-pill brand-muted inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase"
                    >
                      {brandCopy.thankYouHandle}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* 3. Wash & Care Instructions */}
        <div>
          <SectionTitle title="تعليمات العناية" subtitle="Care Instructions" number="03" />
          
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-3/5 flex justify-center">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true, margin: "-100px" }}
                 className="relative w-full max-w-[320px] aspect-[1/1.4]"
               >
                 <div
                   id="care-card"
                   className="brand-card w-full h-full border rounded-[1.7rem] p-5 overflow-hidden relative transition-all duration-700 ring-1 ring-white/10"
                 >
                   {/* Subtle Top Glow */}
                   <div className="brand-card-glow absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-[50px] z-0 rounded-full" />
                   {/* Grainy Texture */}
                   <TextureLayer className="opacity-[0.035] dark:opacity-[0.055]" />

                   <div className="brand-divider text-center mb-3 border-b pb-3 relative z-10">
                     <h3 className="brand-card-title-ghadim brand-strong text-[1.45rem] leading-tight mb-1">تعليمات الغسيل والكي</h3>
                     <p className="brand-muted text-[11px] leading-5">للحفاظ على جودة القطعة والطباعة لأطول فترة ممكنة</p>
                   </div>

                   <div className="space-y-2 relative z-10">
                     <CareItem 
                       icon={Droplets}
                       title="الغسيل بالماء البارد"
                       desc="لا تتجاوز درجة حرارة الماء 30 مئوية"
                     />
                     <CareItem 
                       icon={Shirt}
                       title="قلب القطعة"
                       desc="اغسل القطعة مقلوبة من الداخل للخارج"
                     />
                     <CareItem 
                       icon={Wind}
                       title="تجفيف بالهواء الطلق"
                       desc="تجنب استخدام النشافة الحرارية"
                     />
                     <CareItem 
                       icon={ShieldAlert}
                       title="بدون مبيضات"
                       desc="لا تستخدم الكلور أو المبيضات القوية"
                     />
                     <CareItem 
                       icon={Thermometer}
                       title="الكي بحذر"
                       desc="لا تكوِ منطقة الطباعة مباشرة"
                     />
                   </div>
                   
                   <div className="mt-5 text-center flex justify-center relative z-10">
                     <BrandMark className="h-[28px] w-[34px] opacity-60 transition-opacity duration-300 hover:opacity-100" />
                   </div>
                 </div>
               </motion.div>
            </div>

            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">العناية بالفن</h3>
              <p className="text-theme-subtle leading-loose">
                كل قطعة من وشّى ليست مجرد ملابس، بل هي لوحة فنية مطبوعة باستخدام أفضل تقنيات الطباعة المباشرة على القماش (DTG). لضمان بقاء الألوان نابضة بالحياة، قمنا بتصميم بطاقة تعليمات العناية التي تشرح بدقة وسهولة كيفية المحافظة على القطعة.
              </p>
              <div className="brand-divider pt-4 border-t">
                <DownloadButton
                  onClick={() => handleDownload("care-card", "wusha-care-instructions")}
                  className="w-full"
                >
                  حفظ بطاقة التعليمات (جودة عالية)
                </DownloadButton>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Social Media (Linktree) Card */}
        <div className="mt-32 md:mt-48 mb-32 md:mb-48">
          <SectionTitle title="بطاقة التواصل الاجتماعي" subtitle="Social Links Card" number="04" align="right" />
          
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">منصة رقمية موحدة</h3>
              <p className="text-theme-subtle leading-loose">
                بطاقة أنيقة بأسلوب مباشر (Linktree) تجمع كافة روابط وشّى الرقمية. مُصممة بأسلوب عصري يسهل مشاركته عبر منصات التواصل الاجتماعي أو إضافتها لملف التعريف الخاص بشركتكم لتكون بوابة شاملة للتواصل مع العملاء.
              </p>
              <div className="brand-divider pt-4 border-t">
                <DownloadButton
                  onClick={() => handleDownload("social-card", "wusha-social-links-card")}
                  className="w-full"
                >
                  حفظ بطاقة التواصل بالكامل (رأسية)
                </DownloadButton>
              </div>
            </div>

            <div className="w-full lg:w-3/5 flex justify-center perspective-1000">
              <motion.div 
                initial={{ opacity: 0, y: 50, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{ scale: 1.02 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[320px] aspect-[9/16]"
              >
                <div
                  id="social-card"
                  className="brand-card w-full h-full rounded-[1.7rem] p-5 sm:p-6 flex flex-col items-center justify-start overflow-hidden relative border transition-all duration-700 ring-1 ring-white/10"
                >
                  
                  {/* Subtle Top Glow & Shimmers */}
                  <div className="brand-card-glow absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-[50px] z-0 rounded-full" />
                  
                  {/* Grainy Texture */}
                  <TextureLayer className="opacity-[0.035] dark:opacity-[0.055]" />

                  <div className="relative z-10 flex w-full flex-1 flex-col items-center pt-2 min-h-0">
                    <BrandMark className="mb-4 h-[58px] w-[66px]" />
                    <h2 className="brand-strong text-xl font-bold mb-1 tracking-wide">{brandCopy.linktreeTitle}</h2>
                    <p className="brand-accent text-xs tracking-widest uppercase mb-6">{brandCopy.linktreeSubtitle}</p>

                    {/* Social Buttons List */}
                    <div className="w-full flex flex-col gap-2.5">
                      {config.social_instagram && config.show_instagram !== false && (
                        <div className="brand-social-row w-full px-4 py-2.5 rounded-2xl border flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <Instagram className="w-5 h-5 brand-icon shrink-0" />
                          <span className="brand-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_instagram}</span>
                        </div>
                      )}
                      
                      {config.social_twitter && config.show_twitter !== false && (
                        <div className="brand-social-row w-full px-4 py-2.5 rounded-2xl border flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <XIcon className="w-5 h-5 brand-icon shrink-0" />
                          <span className="brand-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_twitter}</span>
                        </div>
                      )}
                      
                      {config.social_tiktok && config.show_tiktok !== false && (
                        <div className="brand-social-row w-full px-4 py-2.5 rounded-2xl border flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <TikTokIcon className="w-5 h-5 brand-icon shrink-0" />
                          <span className="brand-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_tiktok}</span>
                        </div>
                      )}
                      
                      {config.social_snapchat && config.show_snapchat !== false && (
                        <div className="brand-social-row w-full px-4 py-2.5 rounded-2xl border flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <SnapchatIcon className="w-5 h-5 brand-icon shrink-0" />
                          <span className="brand-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_snapchat}</span>
                        </div>
                      )}

                      {config.social_whatsapp && config.show_whatsapp !== false && (
                        <div className="brand-social-row w-full px-4 py-2.5 rounded-2xl border flex items-center gap-3 relative overflow-hidden group transition-all duration-300 mt-0.5">
                          <WhatsAppIcon className="w-5 h-5 brand-icon shrink-0" />
                          <span className="brand-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_whatsapp}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Web URL Footer Wrapper */}
                  {config.show_website !== false && (
                      <div className="brand-divider relative z-10 mt-5 w-full border-t pt-4 pb-1 text-center">
                        <span
                          dir="ltr"
                          className="brand-link-pill brand-muted mx-auto inline-flex max-w-full items-center justify-center rounded-full border px-4 py-2 text-[11px] tracking-[0.18em] uppercase truncate"
                        >
                          {socialCardWebsite}
                        </span>
                      </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <BrandOptionsArchive
          config={config}
          socialCardWebsite={socialCardWebsite}
          handleDownload={handleDownload}
        />

      </div>
    </div>
  );
}

// Helper Components
function SectionTitle({ title, subtitle, number, align = "left" }: { title: string, subtitle: string, number: string, align?: "left" | "right" }) {
  return (
    <div className={`relative flex flex-col ${align === "right" ? "lg:items-end lg:text-right" : "lg:items-start lg:text-left"} mb-12 lg:mb-16`}>
      <span className="absolute -mt-8 select-none text-6xl font-black text-theme-faint opacity-30 pointer-events-none md:-mt-12 md:text-8xl">
        {number}
      </span>
      <h2 className="text-3xl md:text-5xl font-bold text-theme-strong relative z-10">{title}</h2>
      <p className="brand-accent font-medium tracking-widest uppercase mt-2">{subtitle}</p>
    </div>
  );
}

function DownloadButton({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`brand-download inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--brand-card-accent-soft)] active:translate-y-0 active:scale-[0.98] ${className}`}
    >
      <Download className="h-4 w-4" />
      {children}
    </button>
  );
}

function CareItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="brand-care-item flex items-start gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-300 hover:border-[var(--brand-card-border-strong)]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-card-accent-soft)]">
        <Icon className="w-3.5 h-3.5 brand-icon" />
      </div>
      <div className="min-w-0">
        <h4 className="brand-card-title-ghadim brand-strong text-[12px] leading-tight">{title}</h4>
        <p className="brand-muted mt-0.5 text-[9.5px] leading-[1.35]">{desc}</p>
      </div>
    </div>
  );
}

function BrandOptionsArchive({
  config,
  socialCardWebsite,
  handleDownload,
}: {
  config: unknown;
  socialCardWebsite: string;
  handleDownload: DownloadHandler;
}) {
  return (
    <section className="brand-options-archive mt-12 border-t border-[var(--brand-card-line)] pt-20">
      <SectionTitle title="مكتبة خيارات البطاقات" subtitle="Design options" number="05" />
      <p className="mb-10 max-w-3xl text-theme-subtle leading-loose">
        تم إبقاء التصاميم السابقة كما هي، وإضافة النسخ الجديدة من الملف المرفق بعد
        إزالة طبقة الخطوط الشبكية فقط. كل بطاقة هنا تملك زر تحميل مستقل حتى يمكن
        اختيار النسخة المناسبة مباشرة.
      </p>

      <div className="space-y-14">
        <DesignOptionGroup
          title="بطاقة العمل"
          description="خياران من التصميم السابق، وخياران جديدان للوجهين الأساسيين."
        >
          <DesignOption
            label="السابق 01"
            description="وجه المعلومات"
            elementId="option-business-current-info"
            filename="wusha-business-current-info"
            handleDownload={handleDownload}
            previewClassName="min-h-[320px]"
          >
            <LegacyBusinessInfoPreview id="option-business-current-info" config={config} tone="light" />
          </DesignOption>
          <DesignOption
            label="السابق 02"
            description="وجه الشعار"
            elementId="option-business-current-logo"
            filename="wusha-business-current-logo"
            handleDownload={handleDownload}
            previewClassName="min-h-[320px]"
          >
            <LegacyBusinessLogoPreview id="option-business-current-logo" tone="dark" />
          </DesignOption>
          <DesignOption
            label="الجديد 01"
            description="وجه المعلومات"
            elementId="option-business-import-info"
            filename="wusha-business-import-info"
            handleDownload={handleDownload}
            previewClassName="min-h-[320px]"
          >
            <ImportedBusinessInfoPreview id="option-business-import-info" config={config} tone="dark" />
          </DesignOption>
          <DesignOption
            label="الجديد 02"
            description="وجه الشعار"
            elementId="option-business-import-logo"
            filename="wusha-business-import-logo"
            handleDownload={handleDownload}
            previewClassName="min-h-[320px]"
          >
            <ImportedBusinessLogoPreview id="option-business-import-logo" tone="light" />
          </DesignOption>
        </DesignOptionGroup>

        <DesignOptionGroup
          title="بطاقة الشكر"
          description="نسختان من التصميم السابق، ونسختان جديدتان فاتحة وداكنة بدون الخطوط الشبكية."
        >
          <DesignOption
            label="السابق 01"
            description="النمط الفاتح"
            elementId="option-thank-current-light"
            filename="wusha-thank-current-light"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <LegacyThankYouPreview id="option-thank-current-light" config={config} tone="light" />
          </DesignOption>
          <DesignOption
            label="السابق 02"
            description="النمط الداكن"
            elementId="option-thank-current-dark"
            filename="wusha-thank-current-dark"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <LegacyThankYouPreview id="option-thank-current-dark" config={config} tone="dark" />
          </DesignOption>
          <DesignOption
            label="الجديد 01"
            description="النمط الفاتح"
            elementId="option-thank-import-light"
            filename="wusha-thank-import-light"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <ImportedThankYouPreview id="option-thank-import-light" config={config} tone="light" />
          </DesignOption>
          <DesignOption
            label="الجديد 02"
            description="النمط الداكن"
            elementId="option-thank-import-dark"
            filename="wusha-thank-import-dark"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <ImportedThankYouPreview id="option-thank-import-dark" config={config} tone="dark" />
          </DesignOption>
        </DesignOptionGroup>

        <DesignOptionGroup
          title="تعليمات العناية"
          description="أربع بطاقات جاهزة للطباعة مع الحفاظ على محتوى التعليمات بالكامل."
        >
          <DesignOption
            label="السابق 01"
            description="النمط الفاتح"
            elementId="option-care-current-light"
            filename="wusha-care-current-light"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <LegacyCarePreview id="option-care-current-light" tone="light" />
          </DesignOption>
          <DesignOption
            label="السابق 02"
            description="النمط الداكن"
            elementId="option-care-current-dark"
            filename="wusha-care-current-dark"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <LegacyCarePreview id="option-care-current-dark" tone="dark" />
          </DesignOption>
          <DesignOption
            label="الجديد 01"
            description="النمط الفاتح"
            elementId="option-care-import-light"
            filename="wusha-care-import-light"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <ImportedCarePreview id="option-care-import-light" tone="light" />
          </DesignOption>
          <DesignOption
            label="الجديد 02"
            description="النمط الداكن"
            elementId="option-care-import-dark"
            filename="wusha-care-import-dark"
            handleDownload={handleDownload}
            previewClassName="min-h-[540px]"
          >
            <ImportedCarePreview id="option-care-import-dark" tone="dark" />
          </DesignOption>
        </DesignOptionGroup>

        <DesignOptionGroup
          title="بطاقة التواصل"
          description="خيارات رأسية للمشاركة الرقمية، مع نسختي التصميم الجديد من الملف المرفق."
        >
          <DesignOption
            label="السابق 01"
            description="النمط الفاتح"
            elementId="option-social-current-light"
            filename="wusha-social-current-light"
            handleDownload={handleDownload}
            previewClassName="min-h-[700px]"
          >
            <LegacySocialPreview
              id="option-social-current-light"
              config={config}
              socialCardWebsite={socialCardWebsite}
              tone="light"
            />
          </DesignOption>
          <DesignOption
            label="السابق 02"
            description="النمط الداكن"
            elementId="option-social-current-dark"
            filename="wusha-social-current-dark"
            handleDownload={handleDownload}
            previewClassName="min-h-[700px]"
          >
            <LegacySocialPreview
              id="option-social-current-dark"
              config={config}
              socialCardWebsite={socialCardWebsite}
              tone="dark"
            />
          </DesignOption>
          <DesignOption
            label="الجديد 01"
            description="النمط الفاتح"
            elementId="option-social-import-light"
            filename="wusha-social-import-light"
            handleDownload={handleDownload}
            previewClassName="min-h-[700px]"
          >
            <ImportedSocialPreview
              id="option-social-import-light"
              config={config}
              socialCardWebsite={socialCardWebsite}
              tone="light"
            />
          </DesignOption>
          <DesignOption
            label="الجديد 02"
            description="النمط الداكن"
            elementId="option-social-import-dark"
            filename="wusha-social-import-dark"
            handleDownload={handleDownload}
            previewClassName="min-h-[700px]"
          >
            <ImportedSocialPreview
              id="option-social-import-dark"
              config={config}
              socialCardWebsite={socialCardWebsite}
              tone="dark"
            />
          </DesignOption>
        </DesignOptionGroup>
      </div>
    </section>
  );
}

function DesignOptionGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="brand-options-group">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="brand-accent mb-2 text-xs font-bold uppercase tracking-[0.18em]">
            4 خيارات
          </p>
          <h3 className="text-2xl font-bold text-theme-strong md:text-3xl">{title}</h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-theme-subtle md:text-right">{description}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function DesignOption({
  label,
  description,
  elementId,
  filename,
  handleDownload,
  previewClassName = "",
  children,
}: {
  label: string;
  description: string;
  elementId: string;
  filename: string;
  handleDownload: DownloadHandler;
  previewClassName?: string;
  children: ReactNode;
}) {
  return (
    <article className="brand-option-card rounded-[1.35rem] border p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-theme-strong">{label}</p>
          <p className="mt-1 text-xs font-semibold text-theme-subtle">{description}</p>
        </div>
        <span className="brand-chip brand-muted rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.14em]">
          PNG
        </span>
      </div>
      <div className={`brand-option-stage mb-4 flex min-h-[250px] items-center justify-center rounded-2xl p-4 ${previewClassName}`}>
        {children}
      </div>
      <DownloadButton
        onClick={() => handleDownload(elementId, filename)}
        className="min-h-11 w-full px-3 py-2.5 text-xs"
      >
        حفظ هذا الخيار
      </DownloadButton>
    </article>
  );
}

function exportBgForTone(tone: CardTone) {
  return tone === "dark"
    ? "linear-gradient(145deg,#2a1b1b 0%,#1f1213 48%,#11090a 100%)"
    : "linear-gradient(135deg,#fffaf6 0%,#f5e5de 52%,#ead2ca 100%)";
}

function importedExportBgForTone(tone: CardTone) {
  return tone === "dark" ? IMPORT_DARK_EXPORT_BG : IMPORT_LIGHT_EXPORT_BG;
}

function LegacyBusinessInfoPreview({
  id,
  config,
  tone,
}: {
  id: string;
  config: unknown;
  tone: CardTone;
}) {
  const copy = getBrandCopy(config);

  return (
    <div className="brand-business-card-frame relative aspect-[1.65/1] w-full max-w-[400px]">
      <div
        id={id}
        data-export-bg={exportBgForTone(tone)}
        className={`brand-card brand-card--force-${tone} relative h-full w-full overflow-hidden rounded-[1.35rem] border p-5 ring-1 ring-white/10`}
      >
        <div data-export-hide="true" className="brand-card-glow absolute right-0 top-0 h-20 w-32 rounded-full blur-[42px]" />
        <TextureLayer className="opacity-[0.035]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h4 className="brand-strong truncate text-xl font-bold">{copy.businessCardName}</h4>
              <p className="brand-accent mt-1 text-xs font-semibold tracking-wide">
                {copy.businessCardTitle}
              </p>
            </div>
            <BrandMark className="h-10 w-12" />
          </div>

          <div className="space-y-1.5">
            <LegacyContactLine icon={Phone}>{copy.businessCardPhone}</LegacyContactLine>
            <LegacyContactLine icon={Mail}>{copy.businessCardEmail}</LegacyContactLine>
            <LegacyContactLine icon={Globe}>{copy.businessCardWebsite}</LegacyContactLine>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegacyBusinessLogoPreview({ id, tone }: { id: string; tone: CardTone }) {
  return (
    <div className="brand-business-card-frame relative aspect-[1.65/1] w-full max-w-[400px]">
      <div
        id={id}
        data-export-bg={exportBgForTone(tone)}
        className={`brand-card brand-card--force-${tone} relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] border ring-1 ring-white/10`}
      >
        <div data-export-hide="true" className="brand-card-glow absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[50px]" />
        <TextureLayer className="opacity-[0.035]" />
        <div className="absolute -inset-1/2 -rotate-45 translate-x-[-150%] bg-gradient-to-r from-transparent via-[var(--brand-card-accent-soft)] to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%]" />
        <BrandMark className="relative z-10 h-[88px] w-[104px]" />
      </div>
    </div>
  );
}

function LegacyThankYouPreview({
  id,
  config,
  tone,
}: {
  id: string;
  config: unknown;
  tone: CardTone;
}) {
  const copy = getBrandCopy(config);

  return (
    <div
      id={id}
      data-export-bg={exportBgForTone(tone)}
      className={`brand-card brand-card--force-${tone} relative flex aspect-[1/1.4] w-full max-w-[320px] flex-col items-center overflow-hidden rounded-[1.45rem] border p-6 text-center ring-1 ring-white/10`}
    >
      <div data-export-hide="true" className="brand-card-glow absolute left-1/2 top-0 h-20 w-36 -translate-x-1/2 rounded-full blur-[44px]" />
      <TextureLayer className="opacity-[0.035]" />
      <BrandMark className="relative z-10 mb-6 h-[42px] w-[50px]" />

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <h4 className="brand-card-title-ghadim brand-strong mb-5 text-xl">{copy.thankYouTitle}</h4>
        <div className="brand-muted whitespace-pre-line text-xs leading-6">
          {copy.thankYouMessage}
        </div>
      </div>

      <div className="brand-divider relative z-10 mt-6 w-full border-t pt-4">
        <span
          dir="ltr"
          className="brand-link-pill brand-muted inline-flex max-w-full justify-center rounded-full border px-3 py-1.5 text-[10px] tracking-[0.16em]"
        >
          {copy.thankYouHandle}
        </span>
      </div>
    </div>
  );
}

function LegacyCarePreview({ id, tone }: { id: string; tone: CardTone }) {
  return (
    <div
      id={id}
      data-export-bg={exportBgForTone(tone)}
      className={`brand-card brand-card--force-${tone} relative flex aspect-[1/1.4] w-full max-w-[320px] flex-col overflow-hidden rounded-[1.45rem] border p-5 ring-1 ring-white/10`}
    >
      <div data-export-hide="true" className="brand-card-glow absolute left-1/2 top-0 h-24 w-44 -translate-x-1/2 rounded-full blur-[48px]" />
      <TextureLayer className="opacity-[0.035]" />
      <div className="brand-divider relative z-10 mb-4 border-b pb-3 text-center">
        <h4 className="brand-card-title-ghadim brand-strong mb-1 text-[1.45rem] leading-tight">تعليمات الغسيل والكي</h4>
        <p className="brand-muted text-[10px] leading-5">للحفاظ على جودة القطعة والطباعة</p>
      </div>
      <div className="relative z-10 space-y-2">
        <CareItem icon={Droplets} title="الغسيل بالماء البارد" desc="لا تتجاوز درجة حرارة الماء 30 مئوية" />
        <CareItem icon={Shirt} title="قلب القطعة" desc="اغسل القطعة مقلوبة من الداخل للخارج" />
        <CareItem icon={Wind} title="تجفيف بالهواء الطلق" desc="تجنب استخدام النشافة الحرارية" />
        <CareItem icon={ShieldAlert} title="بدون مبيضات" desc="لا تستخدم الكلور أو المبيضات القوية" />
      </div>
      <BrandMark className="relative z-10 mx-auto mt-5 h-7 w-9 opacity-60" />
    </div>
  );
}

function LegacySocialPreview({
  id,
  config,
  socialCardWebsite,
  tone,
}: {
  id: string;
  config: unknown;
  socialCardWebsite: string;
  tone: CardTone;
}) {
  const copy = getBrandCopy(config);

  return (
    <div
      id={id}
      data-export-bg={exportBgForTone(tone)}
      className={`brand-card brand-card--force-${tone} relative flex aspect-[9/16] w-full max-w-[320px] flex-col overflow-hidden rounded-[1.45rem] border p-5 sm:p-6 ring-1 ring-white/10`}
    >
      <div data-export-hide="true" className="brand-card-glow absolute left-1/2 top-0 h-24 w-44 -translate-x-1/2 rounded-full blur-[48px]" />
      <TextureLayer className="opacity-[0.035]" />
      <div className="relative z-10 flex flex-1 flex-col items-center pt-1">
        <BrandMark className="mb-4 h-[54px] w-[64px]" />
        <h4 className="brand-strong text-lg font-bold">{copy.linktreeTitle}</h4>
        <p className="brand-accent mt-1 mb-5 text-[10px] font-semibold tracking-[0.18em]">
          {copy.linktreeSubtitle}
        </p>
        <div className="flex w-full flex-col gap-2.5">
          {readString(config, "social_instagram") && isVisible(config, "show_instagram") && (
            <LegacySocialLine icon={Instagram} value={readString(config, "social_instagram")} />
          )}
          {readString(config, "social_twitter") && isVisible(config, "show_twitter") && (
            <LegacySocialLine icon={XIcon} value={readString(config, "social_twitter")} />
          )}
          {readString(config, "social_tiktok") && isVisible(config, "show_tiktok") && (
            <LegacySocialLine icon={TikTokIcon} value={readString(config, "social_tiktok")} />
          )}
          {readString(config, "social_snapchat") && isVisible(config, "show_snapchat") && (
            <LegacySocialLine icon={SnapchatIcon} value={readString(config, "social_snapchat")} />
          )}
          {readString(config, "social_whatsapp") && isVisible(config, "show_whatsapp") && (
            <LegacySocialLine icon={WhatsAppIcon} value={readString(config, "social_whatsapp")} />
          )}
        </div>
      </div>
      {isVisible(config, "show_website") && (
        <div className="brand-divider relative z-10 mt-4 border-t pt-3 text-center">
          <span
            dir="ltr"
            className="brand-link-pill brand-muted inline-flex max-w-full rounded-full border px-3 py-1.5 text-[9px] tracking-[0.14em]"
          >
            {socialCardWebsite}
          </span>
        </div>
      )}
    </div>
  );
}

function ImportedBusinessInfoPreview({
  id,
  config,
  tone,
}: {
  id: string;
  config: unknown;
  tone: CardTone;
}) {
  const copy = getBrandCopy(config);
  const logoTone = tone === "dark" ? "#fff8ed" : "#4a210d";

  return (
    <div className="relative aspect-[1.65/1] w-full max-w-[400px]">
      <div
        id={id}
        data-export-bg={importedExportBgForTone(tone)}
        className={`brand-import-card brand-import-card--${tone} relative h-full w-full overflow-hidden rounded-[1.15rem] border p-5`}
      >
        <ImportedTexture tone={tone} />
        <BrandMark
          toneColor={logoTone}
          className="absolute -bottom-7 -left-5 h-32 w-36 opacity-[0.06]"
        />
        <div className="absolute -right-9 -top-12 h-36 w-36 rounded-full bg-[var(--import-orb)]" />
        <div className="absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-[var(--import-orb-strong)]" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <BrandMark toneColor={logoTone} className="h-10 w-12 opacity-95" />
            <div className="min-w-0 text-right">
              <h4 className="truncate text-xl font-black text-[var(--import-strong)]">
                {copy.businessCardName}
              </h4>
              <p className="mt-1 text-xs font-bold text-[var(--import-accent)]">
                {copy.businessCardTitle}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <ImportedContactLine icon={Phone}>{copy.businessCardPhone}</ImportedContactLine>
            <ImportedContactLine icon={Mail}>{copy.businessCardEmail}</ImportedContactLine>
            <ImportedContactLine icon={Globe}>{copy.businessCardWebsite}</ImportedContactLine>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportedBusinessLogoPreview({ id, tone }: { id: string; tone: CardTone }) {
  const logoTone = tone === "dark" ? "#fff8ed" : "#4a210d";

  return (
    <div className="relative aspect-[1.65/1] w-full max-w-[400px]">
      <div
        id={id}
        data-export-bg={importedExportBgForTone(tone)}
        className={`brand-import-card brand-import-card--${tone} relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.15rem] border`}
      >
        <ImportedTexture tone={tone} />
        <div className="absolute -left-8 -top-10 h-40 w-40 rounded-full bg-[var(--import-orb)]" />
        <div className="absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-[var(--import-orb-strong)]" />
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-8 text-center">
          <BrandWordmark toneColor={logoTone} className="h-24 w-full" />
          <div className="mt-4 h-px w-24 bg-[var(--import-line)]" />
          <p className="mt-3 text-xs font-black text-[var(--import-muted)]">
            فنٌ يرتدى
          </p>
        </div>
      </div>
    </div>
  );
}

function ImportedThankYouPreview({
  id,
  config,
  tone,
}: {
  id: string;
  config: unknown;
  tone: CardTone;
}) {
  const copy = getBrandCopy(config);
  const logoTone = tone === "dark" ? "#fff8ed" : "#4a210d";

  return (
    <div
      id={id}
      data-export-bg={importedExportBgForTone(tone)}
      className={`brand-import-card brand-import-card--${tone} relative flex aspect-[1/1.4] w-full max-w-[320px] flex-col items-center overflow-hidden rounded-[1.15rem] border p-7 text-center`}
    >
      <ImportedTexture tone={tone} />
      <div className="absolute -top-12 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-[var(--import-orb)]" />
      <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[var(--import-orb-strong)]" />
      <BrandMark toneColor={logoTone} className="relative z-10 mb-7 h-14 w-16 opacity-95" />

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <h4 className="brand-card-title-ghadim mb-5 text-2xl text-[var(--import-strong)]">
          {copy.thankYouTitle}
        </h4>
        <div className="whitespace-pre-line text-xs leading-7 text-[var(--import-muted)]">
          {copy.thankYouMessage}
        </div>
      </div>

      <div className="relative z-10 mt-7 w-full border-t border-[var(--import-line)] pt-4">
        <span
          dir="ltr"
          className="inline-flex max-w-full rounded-md border border-[var(--import-line)] bg-[var(--import-chip)] px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-[var(--import-accent)]"
        >
          {copy.thankYouHandle}
        </span>
      </div>
    </div>
  );
}

function ImportedCarePreview({ id, tone }: { id: string; tone: CardTone }) {
  const logoTone = tone === "dark" ? "#fff8ed" : "#4a210d";

  return (
    <div
      id={id}
      data-export-bg={importedExportBgForTone(tone)}
      className={`brand-import-card brand-import-card--${tone} relative flex aspect-[1/1.4] w-full max-w-[320px] flex-col overflow-hidden rounded-[1.15rem] border p-5`}
    >
      <ImportedTexture tone={tone} />
      <div className="absolute -top-11 left-5 h-32 w-32 rounded-full bg-[var(--import-orb)]" />
      <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-[var(--import-orb-strong)]" />

      <div className="relative z-10 mb-4 border-b border-[var(--import-line)] pb-3 text-center">
        <BrandMark toneColor={logoTone} className="mx-auto mb-2 h-9 w-11 opacity-95" />
        <h4 className="brand-card-title-ghadim mb-1 text-[1.45rem] leading-tight text-[var(--import-strong)]">
          تعليمات الغسيل والكي
        </h4>
        <p className="text-[10px] leading-5 text-[var(--import-muted)]">
          للحفاظ على خامة القطعة وطباعة وشّى
        </p>
      </div>

      <div className="relative z-10 space-y-2">
        <ImportedCareLine icon={Droplets} title="الغسيل بالماء البارد" desc="لا تتجاوز درجة حرارة الماء 30 مئوية" />
        <ImportedCareLine icon={Shirt} title="قلب القطعة" desc="اغسل القطعة مقلوبة من الداخل للخارج" />
        <ImportedCareLine icon={Wind} title="تجفيف بالهواء الطلق" desc="تجنب استخدام النشافة الحرارية" />
        <ImportedCareLine icon={ShieldAlert} title="بدون مبيضات" desc="لا تستخدم الكلور أو المبيضات القوية" />
        <ImportedCareLine icon={Thermometer} title="الكي بحذر" desc="لا تكوِ منطقة الطباعة مباشرة" />
      </div>
    </div>
  );
}

function ImportedSocialPreview({
  id,
  config,
  socialCardWebsite,
  tone,
}: {
  id: string;
  config: unknown;
  socialCardWebsite: string;
  tone: CardTone;
}) {
  const copy = getBrandCopy(config);
  const logoTone = tone === "dark" ? "#fff8ed" : "#4a210d";

  return (
    <div
      id={id}
      data-export-bg={importedExportBgForTone(tone)}
      className={`brand-import-card brand-import-card--${tone} relative flex aspect-[9/16] w-full max-w-[320px] flex-col overflow-hidden rounded-[1.15rem] border p-5 sm:p-6`}
    >
      <ImportedTexture tone={tone} />
      <div className="absolute -top-11 left-3 h-32 w-32 rounded-full bg-[var(--import-orb)]" />
      <div className="absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-[var(--import-orb-strong)]" />

      <div className="relative z-10 flex flex-1 flex-col items-center pt-1">
        <BrandWordmark toneColor={logoTone} className="mb-3 h-16 w-full" />
        <h4 className="text-lg font-black text-[var(--import-strong)]">{copy.linktreeTitle}</h4>
        <p className="mt-1 mb-5 text-[10px] font-bold tracking-[0.18em] text-[var(--import-accent)]">
          {copy.linktreeSubtitle}
        </p>

        <div className="flex w-full flex-col gap-2.5">
          {readString(config, "social_instagram") && isVisible(config, "show_instagram") && (
            <ImportedSocialLine icon={Instagram} value={readString(config, "social_instagram")} />
          )}
          {readString(config, "social_twitter") && isVisible(config, "show_twitter") && (
            <ImportedSocialLine icon={XIcon} value={readString(config, "social_twitter")} />
          )}
          {readString(config, "social_tiktok") && isVisible(config, "show_tiktok") && (
            <ImportedSocialLine icon={TikTokIcon} value={readString(config, "social_tiktok")} />
          )}
          {readString(config, "social_snapchat") && isVisible(config, "show_snapchat") && (
            <ImportedSocialLine icon={SnapchatIcon} value={readString(config, "social_snapchat")} />
          )}
          {readString(config, "social_whatsapp") && isVisible(config, "show_whatsapp") && (
            <ImportedSocialLine icon={WhatsAppIcon} value={readString(config, "social_whatsapp")} />
          )}
        </div>
      </div>

      {isVisible(config, "show_website") && (
        <div className="relative z-10 mt-4 border-t border-[var(--import-line)] pt-3 text-center">
          <span
            dir="ltr"
            className="inline-flex max-w-full truncate rounded-md border border-[var(--import-line)] bg-[var(--import-chip)] px-3 py-1.5 text-[9px] font-bold tracking-[0.14em] text-[var(--import-muted)]"
          >
            {socialCardWebsite}
          </span>
        </div>
      )}
    </div>
  );
}

function ImportedTexture({ tone }: { tone: CardTone }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={
          tone === "dark"
            ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,248,237,0.14),transparent_32%),radial-gradient(circle_at_86%_76%,rgba(140,93,63,0.18),transparent_34%)]"
            : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(74,33,13,0.11),transparent_30%),radial-gradient(circle_at_88%_78%,rgba(129,126,134,0.16),transparent_34%)]"
        }
      />
      <TextureLayer className={tone === "dark" ? "opacity-[0.04]" : "opacity-[0.03]"} />
    </>
  );
}

function LegacyContactLine({ icon: Icon, children }: { icon: any; children: ReactNode }) {
  return (
    <div className="brand-muted flex min-w-0 items-center gap-2 text-[11px]">
      <Icon className="brand-icon h-3.5 w-3.5 shrink-0" />
      <span dir="ltr" className="min-w-0 truncate text-left tracking-[0.06em]">
        {children}
      </span>
    </div>
  );
}

function LegacySocialLine({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="brand-social-row flex min-h-10 w-full items-center gap-2.5 rounded-xl border px-3 py-2">
      <Icon className="brand-icon h-4 w-4 shrink-0" />
      <span
        dir="ltr"
        className="brand-strong min-w-0 flex-1 truncate text-left text-[11px] font-semibold tracking-[0.06em]"
      >
        {value}
      </span>
    </div>
  );
}

function ImportedContactLine({ icon: Icon, children }: { icon: any; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 text-[11px] text-[var(--import-muted)]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--import-accent)]" />
      <span dir="ltr" className="min-w-0 truncate text-left font-semibold tracking-[0.08em]">
        {children}
      </span>
    </div>
  );
}

function ImportedCareLine({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--import-line)] bg-[var(--import-chip)] px-3 py-1.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--import-icon-bg)] text-[var(--import-accent)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <h5 className="brand-card-title-ghadim text-[12px] leading-tight text-[var(--import-strong)]">{title}</h5>
        <p className="mt-0.5 text-[9.5px] leading-[1.35] text-[var(--import-muted)]">{desc}</p>
      </div>
    </div>
  );
}

function ImportedSocialLine({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-[var(--import-line)] bg-[var(--import-chip)] px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-[var(--import-accent)]" />
      <span
        dir="ltr"
        className="min-w-0 flex-1 truncate text-left text-[11px] font-bold tracking-[0.06em] text-[var(--import-strong)]"
      >
        {value}
      </span>
    </div>
  );
}
