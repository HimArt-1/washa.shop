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
        {/* Golden glow ring */}
        <div
          className="absolute inset-[-3px] rounded-full opacity-70 animate-pulse-slow"
          style={{
            background: "conic-gradient(from 0deg, #5A3E2B, #ceae7f, #e0c99a, #ceae7f, #5A3E2B)",
            filter: "blur(4px)",
          }}
        />
        {/* Inner dark ring */}
        <div className="absolute inset-[-1px] rounded-full bg-[#0a0a0a]" />
        {/* Logo image */}
        <Image
          src="/logo.png"
          alt="وشّى"
          width={dims.width}
          height={dims.height}
          className="relative z-10 object-contain select-none rounded-full"
          priority
          sizes="(max-width: 640px) 40px, 48px"
        />
      </motion.div>
    </Link>
  );
}
