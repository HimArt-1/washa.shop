"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shirt, type LucideIcon, Upload, Keyboard, RefreshCw } from "lucide-react";

// Mock Icons until I verify Lucide imports, using generic names if needed or assuming standard Lucide
import { Wand2, Image as ImageIcon, Type, Sparkles } from "lucide-react";

type ApparelType = "tshirt" | "hoodie";

interface ToolsPanelProps {
    setGeneratedImage: (img: string | null) => void;
    apparelType: ApparelType;
    setApparelType: (type: ApparelType) => void;
}

const tabs = [
    { id: "ai-create", label: "توليد بالذكاء", icon: Sparkles },
    { id: "upload", label: "رفع صورة", icon: Upload },
    { id: "text", label: "نصوص", icon: Type },
];

export function ToolsPanel({ setGeneratedImage, apparelType, setApparelType }: ToolsPanelProps) {
    const [activeTab, setActiveTab] = useState("ai-create");
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        if (!prompt) return;
        setIsGenerating(true);
        // Simulate generation
        setTimeout(() => {
            setGeneratedImage("https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=500&q=80"); // Mock
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-fg/10">
                <h2 className="text-2xl font-bold text-theme flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-gold" />
                    استوديو التصميم
                </h2>
                <p className="text-sm text-theme-soft mt-2">أطلق العنان لإبداعك بمساعدة الذكاء الاصطناعي</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-fg/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-4 flex flex-col items-center gap-2 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? "text-gold bg-gold/5 border-b-2 border-gold"
                            : "text-theme-soft hover:text-theme hover:bg-fg/5"
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active Tool Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === "ai-create" && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-theme mb-3">اختر المنتج</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setApparelType("tshirt")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${apparelType === "tshirt"
                                        ? "border-gold bg-gold/10 text-gold"
                                        : "border-fg/10 hover:border-fg/30 text-theme-soft"
                                        }`}
                                >
                                    <div className="w-10 h-10 bg-current/10 rounded-full flex items-center justify-center">
                                        <Shirt className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-bold">تيشيرت</span>
                                </button>
                                <button
                                    onClick={() => setApparelType("hoodie")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${apparelType === "hoodie"
                                        ? "border-gold bg-gold/10 text-gold"
                                        : "border-fg/10 hover:border-fg/30 text-theme-soft"
                                        }`}
                                >
                                    <div className="w-10 h-10 bg-current/10 rounded-full flex items-center justify-center">
                                        <Shirt className="w-6 h-6" /> {/* Placeholder for Hoodie icon if needed */}
                                    </div>
                                    <span className="text-sm font-bold">هودي</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-theme mb-3">صف فكرتك</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="مثال: رسم زيتي لخيول عربية تركض في الصحراء وقت الغروب..."
                                className="w-full h-32 p-4 rounded-xl bg-bg border border-fg/10 focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none transition-all placeholder:text-theme-faint"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className="w-full btn-gold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    جاري التوليد...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    توليد التصميم
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Placeholders for other tabs */}
                {activeTab !== "ai-create" && (
                    <div className="h-full flex flex-col items-center justify-center text-theme-subtle text-center">
                        <p>هذه الأداة قادمة قريباً</p>
                    </div>
                )}
            </div>
        </div>
    );
}
