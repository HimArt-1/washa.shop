"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean; // إذا كان false، لن يتم استخدام Link (مفيد عند استخدام Logo داخل Link آخر)
  src?: string;
  preserveColor?: boolean;
  aspectRatio?: number;
  toneColor?: string;
}

const sizeMap = {
  sm: { width: 40, height: 40 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
};

export function Logo({
  className = "",
  size = "md",
  asLink = true,
  src = "/logo.png",
  preserveColor = false,
  aspectRatio,
  toneColor,
}: LogoProps) {
  const dims = sizeMap[size];
  const imageHeight = aspectRatio ? Math.round(dims.width / aspectRatio) : dims.height;

  const logoContent = (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {toneColor ? (
        <span
          role="img"
          aria-label="وشّى"
          className="block select-none"
          style={{
            width: dims.width,
            height: imageHeight,
            backgroundColor: toneColor,
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            filter: "drop-shadow(0 0 6px rgba(206, 174, 127, 0.22))",
          }}
        />
      ) : (
        <Image
          src={src}
          alt="وشّى"
          width={dims.width}
          height={imageHeight}
          className="object-contain select-none"
          style={
            preserveColor
              ? {
                  filter: "drop-shadow(0 0 6px rgba(206, 174, 127, 0.22))",
                }
              : {
                  filter: "sepia(0.4) saturate(2.2) hue-rotate(5deg) brightness(1.05) drop-shadow(0 0 6px rgba(206, 174, 127, 0.35))",
                }
          }
          priority
          sizes="(max-width: 640px) 40px, 48px"
        />
      )}
    </motion.div>
  );

  if (!asLink) {
    return (
      <div className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 p-2 rounded-xl ${className}`}>
        {logoContent}
      </div>
    );
  }

  return (
    <Link
      href="/"
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 p-2 rounded-xl hover:bg-theme-subtle transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] ${className}`}
      aria-label="وشّى — الصفحة الرئيسية"
    >
      {logoContent}
    </Link>
  );
}
