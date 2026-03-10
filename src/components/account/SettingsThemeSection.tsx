"use client";

import { Sun, Moon } from "lucide-react";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";

export function SettingsThemeSection() {
    const ctx = useContext(ThemeContext);
    if (!ctx) return null;
    const { theme, setTheme } = ctx;

    return (
        <div
            className="p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300"
            style={{
                backgroundColor: "color-mix(in srgb, var(--wusha-surface) 50%, transparent)",
                borderColor: "color-mix(in srgb, var(--wusha-text) 6%, transparent)",
            }}
        >
            <h3 className="font-bold text-theme mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-gold" />
                تفضيلات العرض
            </h3>
            <p className="text-sm mb-4" style={{ color: "color-mix(in srgb, var(--wusha-text) 50%, transparent)" }}>
                اختر مظهر الواجهة المناسب لك
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                        theme === "dark"
                            ? "ring-2 ring-[var(--wusha-gold)]"
                            : "opacity-60 hover:opacity-100"
                    }`}
                    style={{
                        backgroundColor: theme === "dark" ? "color-mix(in srgb, var(--wusha-gold) 15%, transparent)" : "color-mix(in srgb, var(--wusha-text) 5%, transparent)",
                        border: "1px solid",
                        borderColor: theme === "dark" ? "var(--wusha-gold)" : "color-mix(in srgb, var(--wusha-text) 10%, transparent)",
                    }}
                >
                    <Moon className="w-5 h-5" />
                    الوضع الداكن
                </button>
                <button
                    onClick={() => setTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                        theme === "light"
                            ? "ring-2 ring-[var(--wusha-gold)]"
                            : "opacity-60 hover:opacity-100"
                    }`}
                    style={{
                        backgroundColor: theme === "light" ? "color-mix(in srgb, var(--wusha-gold) 15%, transparent)" : "color-mix(in srgb, var(--wusha-text) 5%, transparent)",
                        border: "1px solid",
                        borderColor: theme === "light" ? "var(--wusha-gold)" : "color-mix(in srgb, var(--wusha-text) 10%, transparent)",
                    }}
                >
                    <Sun className="w-5 h-5" />
                    الوضع الفاتح
                </button>
            </div>
        </div>
    );
}
