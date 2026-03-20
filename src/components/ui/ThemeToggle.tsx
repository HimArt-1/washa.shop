"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.button
      onClick={toggleTheme}
      className="theme-toggle-pill group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-2.5 py-2"
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      aria-label={theme === "dark" ? "تفعيل النمط الفاتح" : "تفعيل النمط الداكن"}
      aria-pressed={theme === "dark"}
    >
      <motion.span
        key={mounted ? theme : "pending"}
        initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.22 }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border"
        style={{
          color: "var(--wusha-gold)",
          backgroundColor: "color-mix(in srgb, var(--wusha-gold) 12%, transparent)",
          borderColor: "color-mix(in srgb, var(--wusha-gold) 16%, transparent)",
        }}
      >
        {theme === "dark" ? (
          <Sun className="h-4.5 w-4.5" />
        ) : (
          <Moon className="h-4.5 w-4.5" />
        )}
      </motion.span>
      <span className="hidden sm:flex flex-col items-start leading-none">
        <span className="text-[10px] font-bold tracking-[0.22em] text-theme-faint">
          المظهر
        </span>
        <span className="text-xs font-semibold text-theme-soft">
          {mounted ? (theme === "dark" ? "داكن" : "فاتح") : "..." }
        </span>
      </span>
    </motion.button>
  );
}
