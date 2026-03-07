"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { width: 40, height: 40 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
};

export function Logo({ className = "", size = "md" }: LogoProps) {
  const dims = sizeMap[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 p-2 rounded-xl hover:bg-white/5 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] ${className}`}
      aria-label="وشّى — الصفحة الرئيسية"
    >
      <motion.div
        className="relative flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <Image
          src="/logo.png"
          alt="وشّى"
          width={dims.width}
          height={dims.height}
          className="object-contain select-none"
          style={{
            filter: "sepia(0.3) saturate(1.8) hue-rotate(5deg) brightness(1.1)",
          }}
          priority
          sizes="(max-width: 640px) 40px, 48px"
        />
      </motion.div>
    </Link>
  );
}
