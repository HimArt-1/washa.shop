"use client";

import { Sun, Moon } from "lucide-react";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return null;
  const { theme, toggleTheme } = ctx;

  return (
    <motion.button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center"
      style={{
        color: "var(--wusha-text-muted)",
        backgroundColor: "color-mix(in srgb, var(--wusha-text) 5%, transparent)",
      }}
      whileHover={{
        color: "var(--wusha-gold)",
        backgroundColor: "color-mix(in srgb, var(--wusha-gold) 10%, transparent)",
        scale: 1.05,
      }}
      whileTap={{ scale: 0.95 }}
      aria-label={theme === "dark" ? "تفعيل النمط الفاتح" : "تفعيل النمط الداكن"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </motion.button>
  );
}
