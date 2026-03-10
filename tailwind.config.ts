import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // وشّى — استخدام المتغيرات (للألوان الأساسية فقط؛ الـ opacity لا يعمل مع var)
        gold: "var(--wusha-gold)",
        "gold-light": "var(--wusha-gold-light)",
        accent: "var(--wusha-mist)",
        primary: "var(--wusha-forest)",
        secondary: "var(--wusha-earth)",
        earth: "var(--wusha-earth)",
        mist: "var(--wusha-mist)",
        forest: "var(--wusha-forest)",
        // للـ opacity: استخدم text-theme-subtle, bg-theme-subtle من globals.css
        bg: "#080808",
        fg: "#f0ebe3",
        surface: "#111111",
        "surface-2": "#1a1a1a",
        sand: "#f0ebe3",
        ink: "#f0ebe3",
        wusha: {
          bg: "#080808",
          surface: "#111111",
          ink: "#f0ebe3",
          earth: "#5A3E2B",
          mist: "#9D8BB1",
          forest: "#2a7a5a",
          gold: "#ceae7f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 20s linear infinite",
        "gradient": "gradient 8s ease infinite",
        "reveal": "reveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "neon-pulse": "neonPulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        reveal: {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0% 0 0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(206, 174, 127, 0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(206, 174, 127, 0.25)" },
        },
        neonPulse: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(206, 174, 127, 0.3)" },
          "50%": { opacity: "0.95", boxShadow: "0 0 40px rgba(206, 174, 127, 0.5)" },
        },
      },
      backgroundImage: {
        "noise": "url('/noise.svg')",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
