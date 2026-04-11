"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Settings2, Layout, LayoutPanelTop, Monitor, Type, Save, Download } from "lucide-react";
import { InvoiceOrder } from "@/lib/invoice";
import {
    LabelConfig,
    defaultLabelConfig,
    generateLabelHTML,
    openLabelPrint
} from "@/lib/shipping-label";

interface ShippingLabelBuilderProps {
    order: InvoiceOrder | null;
    onClose: () => void;
}

export function ShippingLabelBuilder({ order, onClose }: ShippingLabelBuilderProps) {
    const [config, setConfig] = useState<LabelConfig>(defaultLabelConfig);
    const [previewHtml, setPreviewHtml] = useState("");
    const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Load saved settings on mount
    useEffect(() => {
        const saved = localStorage.getItem("wusha_label_config");
        if (saved) {
            try {
                setConfig({ ...defaultLabelConfig, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to load label config", e);
            }
        }
    }, []);

    // Update preview HTML whenever config or order changes
    useEffect(() => {
        if (!order) return;
        const html = generateLabelHTML(order, config);
        setPreviewHtml(html);
    }, [config, order]);

    const handleSaveConfig = () => {
        localStorage.setItem("wusha_label_config", JSON.stringify(config));
        setFeedback({ tone: "success", message: "تم حفظ إعدادات البوليصة بنجاح." });
    };

    const handlePrint = () => {
        if (!order) return;
        const opened = openLabelPrint(order, config);
        if (!opened) {
            setFeedback({ tone: "error", message: "يرجى السماح بالنوافذ المنبثقة لفتح البوليصة." });
        }
    };

    const updateConfig = (key: keyof LabelConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (!order) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex"
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

                {/* Main Modal Container */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative m-auto flex h-[85vh] w-full max-w-5xl overflow-hidden rounded-[32px] bg-[#0a0a0a] border border-white/10 shadow-2xl"
                >
                    {/* ─── LEFT PANEL: CONTROLS ─── */}
                    <div className="flex w-[350px] shrink-0 flex-col border-l border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between border-b border-white/5 p-6 h-20">
                            <h2 className="text-sm font-black text-theme flex items-center gap-3 uppercase tracking-widest">
                                <Settings2 className="w-4 h-4 text-gold" />
                                إعدادات البوليصة
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X className="w-5 h-5 text-theme-faint" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 styled-scrollbar">
                            {feedback && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`rounded-2xl border px-4 py-3 text-[11px] font-bold ${feedback.tone === "success" 
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                                        : "border-red-500/20 bg-red-500/10 text-red-400"}`}
                                >
                                    {feedback.message}
                                </motion.div>
                            )}

                            {/* Format Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-theme-faint uppercase tracking-widest flex items-center gap-2">
                                    <Layout className="w-4 h-4" />
                                    حجم الورق / التنسيق
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => updateConfig("format", "thermal")}
                                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${config.format === "thermal" ? "bg-gold/10 border-gold/40 text-gold" : "bg-white/5 border-white/5 text-theme-faint hover:bg-white/10"}`}
                                    >
                                        <Monitor className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase">Thermal (4x6)</span>
                                    </button>
                                    <button
                                        onClick={() => updateConfig("format", "standard")}
                                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${config.format === "standard" ? "bg-gold/10 border-gold/40 text-gold" : "bg-white/5 border-white/5 text-theme-faint hover:bg-white/10"}`}
                                    >
                                        <LayoutPanelTop className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase">Standard (A4)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-theme-faint uppercase tracking-widest flex items-center gap-2">
                                    <Type className="w-4 h-4" />
                                    خيارات العرض
                                </label>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={config.showItems}
                                            onChange={(e) => updateConfig("showItems", e.target.checked)}
                                            className="w-4 h-4 accent-gold"
                                        />
                                        <span className="text-xs font-bold text-theme">إظهار محتويات الطلب</span>
                                    </label>
                                </div>
                            </div>

                            {/* Branding */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-theme-faint uppercase tracking-widest flex items-center gap-2">
                                    <LayoutPanelTop className="w-4 h-4" />
                                    بيانات المرسل
                                </label>
                                <div className="space-y-3">
                                    <input
                                        placeholder="اسم الشركة"
                                        value={config.companyName}
                                        onChange={(e) => updateConfig("companyName", e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-theme focus:border-gold/50 transition-all outline-none"
                                    />
                                    <input
                                        placeholder="رقم هاتف المنشأة"
                                        value={config.companyPhone}
                                        onChange={(e) => updateConfig("companyPhone", e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-theme focus:border-gold/50 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveConfig}
                                    className="flex-1 px-4 py-3 rounded-2xl border border-white/10 text-[11px] font-black text-theme-subtle hover:text-gold hover:border-gold/30 transition-all"
                                >
                                    <Save className="w-4 h-4 mx-auto" />
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex-[3] px-6 py-4 rounded-2xl bg-gold text-[#0a0a0a] text-xs font-black shadow-lg shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    طباعة البوليصة
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT PANEL: PREVIEW ─── */}
                    <div className="flex-1 bg-[#0f0f0f] relative p-8 flex items-center justify-center overflow-auto">
                        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
                        
                        <div className={`bg-white shadow-2xl transition-all duration-500 origin-center ${config.format === "thermal" ? "w-[400px] aspect-[4/6]" : "w-[600px] aspect-[1/1.4]"}`}>
                            <iframe
                                ref={iframeRef}
                                srcDoc={previewHtml}
                                className="w-full h-full border-none"
                                title="Waybill Preview"
                            />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
