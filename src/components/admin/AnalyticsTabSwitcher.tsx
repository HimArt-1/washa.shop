"use client";

// وشّى | WASHA — مبدّل تبويبات التحليلات: المالية ↔ السلوكية
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Activity } from "lucide-react";

interface Props {
    financialTab: React.ReactNode;
    behavioralTab: React.ReactNode;
}

export function AnalyticsTabSwitcher({ financialTab, behavioralTab }: Props) {
    const [activeTab, setActiveTab] = useState<"financial" | "behavioral">("financial");

    return (
        <div className="space-y-6">
            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-theme-subtle p-1 rounded-xl w-fit" dir="rtl">
                <button
                    onClick={() => setActiveTab("financial")}
                    className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        activeTab === "financial"
                            ? "text-[#1a1612]"
                            : "text-theme-faint hover:text-theme-soft"
                    }`}
                >
                    {activeTab === "financial" && (
                        <motion.div
                            layoutId="analytics-tab-pill"
                            className="absolute inset-0 bg-gold rounded-lg"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                        />
                    )}
                    <TrendingUp className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">المالية والإيرادات</span>
                </button>
                <button
                    onClick={() => setActiveTab("behavioral")}
                    className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        activeTab === "behavioral"
                            ? "text-[#1a1612]"
                            : "text-theme-faint hover:text-theme-soft"
                    }`}
                >
                    {activeTab === "behavioral" && (
                        <motion.div
                            layoutId="analytics-tab-pill"
                            className="absolute inset-0 bg-gold rounded-lg"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                        />
                    )}
                    <Activity className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">السلوك والتحويل</span>
                </button>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                >
                    {activeTab === "financial" ? financialTab : behavioralTab}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
