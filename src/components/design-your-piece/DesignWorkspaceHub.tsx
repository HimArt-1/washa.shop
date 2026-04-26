"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, ArrowLeft, Layers2, Sparkles, Camera } from "lucide-react";
import { DesignYourPieceWizard } from "./DesignYourPieceWizard";
import type {
    CustomDesignGarment,
    CustomDesignStyle,
    CustomDesignArtStyle,
    CustomDesignColorPackage,
    CustomDesignStudioItem,
    GarmentStudioMockup,
    CustomDesignPreset,
    CustomDesignOptionCompatibility,
} from "@/types/database";

type WorkspaceTab = "washa-ai" | "preorder";

type Props = {
    washaAiAvailable: boolean;
    garments: CustomDesignGarment[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
    studioItems: CustomDesignStudioItem[];
    garmentStudioMockups: GarmentStudioMockup[];
    presets: CustomDesignPreset[];
    compatibilities: CustomDesignOptionCompatibility[];
};

export function DesignWorkspaceHub({
    washaAiAvailable,
    garments,
    styles,
    artStyles,
    colorPackages,
    studioItems,
    garmentStudioMockups,
    presets,
    compatibilities,
}: Props) {
    // Default to washa-ai if available, otherwise preorder
    const [activeTab, setActiveTab] = useState<WorkspaceTab>(washaAiAvailable ? "washa-ai" : "preorder");

    return (
        <div className="space-y-8 w-full max-w-6xl mx-auto">
            {/* Header & Workspace Switcher */}
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">مساحة عمل التصميم</p>
                    <h1 className="mt-2 text-3xl font-bold text-theme sm:text-4xl">
                        اختر <span className="text-gradient">طريقة البدء</span>
                    </h1>
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex p-1.5 rounded-2xl bg-theme-faint/80 backdrop-blur-md border border-theme-subtle w-full max-w-sm sm:max-w-md relative z-20"
                >
                    <button
                        onClick={() => washaAiAvailable && setActiveTab("washa-ai")}
                        disabled={!washaAiAvailable}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                            activeTab === "washa-ai" ? "text-sky-100" : "text-theme-subtle hover:text-theme"
                        } ${!washaAiAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {activeTab === "washa-ai" && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute inset-0 rounded-xl bg-[linear-gradient(145deg,rgba(14,165,233,0.3),rgba(2,6,23,0.4))] border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Wand2 className="w-4 h-4" />
                            WASHA AI
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("preorder")}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                            activeTab === "preorder" ? "text-gold" : "text-theme-subtle hover:text-theme"
                        }`}
                    >
                        {activeTab === "preorder" && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute inset-0 rounded-xl bg-[linear-gradient(145deg,rgba(212,175,55,0.15),rgba(2,6,23,0.3))] border border-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Layers2 className="w-4 h-4" />
                            الطلب المسبق
                        </span>
                    </button>
                </motion.div>
            </div>

            {/* Workspace Content */}
            <div className="relative min-h-[400px]">
                <AnimatePresence mode="wait">
                    {activeTab === "washa-ai" && (
                        <motion.div
                            key="washa-ai-tab"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex justify-center pt-8"
                        >
                            <Link
                                href="/design/washa-ai"
                                className="group w-full max-w-2xl theme-surface-panel flex flex-col items-center text-center rounded-[2rem] border border-sky-500/20 bg-[linear-gradient(145deg,rgba(14,165,233,0.08),rgba(2,6,23,0.4))] p-8 sm:p-12 shadow-[0_24px_80px_-40px_rgba(14,165,233,0.45)] transition-all duration-300 hover:border-sky-400/40 hover:shadow-[0_28px_90px_-36px_rgba(14,165,233,0.6)]"
                            >
                                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-500/10 text-sky-300 group-hover:scale-110 group-hover:bg-sky-500/20 transition-all duration-500">
                                    <Wand2 className="h-10 w-10" />
                                </div>
                                <h2 className="text-2xl font-black text-theme sm:text-3xl mb-4">الدخول إلى WASHA AI</h2>
                                <p className="text-theme-subtle max-w-md text-sm sm:text-base leading-relaxed mb-8">
                                    تجربة تصميم ذكية وغامرة بالكامل. اكتب ما تتخيله، وسيقوم الذكاء الاصطناعي بتحويله إلى موكب جاهز للطباعة بدقة عالية، مع إمكانية التعديل الفوري.
                                </p>
                                <span className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-sky-500/10 px-8 text-sm font-bold text-sky-200 border border-sky-500/20 transition-all group-hover:bg-sky-500 group-hover:text-white">
                                    بدء التوليد الذكي الآن
                                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                </span>
                            </Link>
                        </motion.div>
                    )}

                    {activeTab === "preorder" && (
                        <motion.div
                            key="preorder-tab"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <DesignYourPieceWizard
                                garments={garments}
                                styles={styles}
                                artStyles={artStyles}
                                colorPackages={colorPackages}
                                studioItems={studioItems}
                                garmentStudioMockups={garmentStudioMockups}
                                presets={presets}
                                compatibilities={compatibilities}
                                dtfStudioShortcutEnabled={false}
                                variant="preorder"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
