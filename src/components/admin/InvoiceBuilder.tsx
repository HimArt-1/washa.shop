"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Settings2, Palette, Type, LayoutTemplate, Save, FileDown, Layers, FileText, Download } from "lucide-react";
import {
    InvoiceOrder,
    InvoiceConfig,
    defaultInvoiceConfig,
    generateInvoiceHTML,
    openInvoicePrint
} from "@/lib/invoice";

interface InvoiceBuilderProps {
    order: InvoiceOrder | null;
    onClose: () => void;
}

export function InvoiceBuilder({ order, onClose }: InvoiceBuilderProps) {
    const [config, setConfig] = useState<InvoiceConfig>(defaultInvoiceConfig);
    const [previewHtml, setPreviewHtml] = useState("");
    const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Load saved settings on mount
    useEffect(() => {
        const saved = localStorage.getItem("wusha_invoice_config");
        if (saved) {
            try {
                setConfig({ ...defaultInvoiceConfig, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to load invoice config", e);
            }
        }
    }, []);

    // Update preview HTML whenever config or order changes
    useEffect(() => {
        if (!order) return;
        const html = generateInvoiceHTML(order, config);
        // Inject script to handle resizing/scaling if needed, or just let CSS handle it
        setPreviewHtml(html);
    }, [config, order]);

    const handleSaveConfig = () => {
        localStorage.setItem("wusha_invoice_config", JSON.stringify(config));
        setFeedback({ tone: "success", message: "تم حفظ إعدادات الفاتورة بنجاح." });
    };

    const handlePrint = () => {
        if (!order) return;
        const opened = openInvoicePrint(order, config);
        if (!opened) {
            setFeedback({ tone: "error", message: "يرجى السماح بالنوافذ المنبثقة لفتح الفاتورة." });
        }
    };

    const updateConfig = (key: keyof InvoiceConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const updateHiddenColumn = (col: keyof InvoiceConfig['hiddenColumns'], value: boolean) => {
        setConfig(prev => ({
            ...prev,
            hiddenColumns: {
                ...prev.hiddenColumns,
                [col]: value
            }
        }));
    };

    if (!order) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex"
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose} />

                {/* Main Modal Container */}
                <motion.div
                    initial={{ x: 200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 200, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="theme-surface-panel relative m-auto flex h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl shadow-2xl"
                    style={{ zIndex: 51 }}
                >
                    {/* ─── LEFT PANEL: CONTROLS ─── */}
                    <div className="relative z-10 flex h-full w-[400px] shrink-0 flex-col border-l border-theme-subtle bg-theme-faint">
                        <div className="flex items-center justify-between border-b border-theme-subtle bg-theme-faint p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-theme flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-gold" />
                                تصميم الفاتورة
                            </h2>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-theme-subtle transition-colors hover:bg-[color:var(--surface-elevated)] hover:text-theme"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-24 styled-scrollbar">
                            {feedback && (
                                <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.tone === "success"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                    : "border-red-500/20 bg-red-500/10 text-red-200"
                                    }`}>
                                    {feedback.message}
                                </div>
                            )}

                            {/* Templates */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-theme-strong flex items-center gap-2">
                                    <LayoutTemplate className="w-4 h-4 text-theme-subtle" />
                                    القالب
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["classic", "modern", "minimal"] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => updateConfig("template", t)}
                                            className={`
                                                relative p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all
                                                ${config.template === t
                                                    ? "bg-gold/10 border-gold/30 text-gold shadow-[0_0_15px_rgba(206,174,127,0.1)]"
                                                    : "bg-theme-faint border-theme-subtle text-theme-subtle hover:bg-theme-subtle"}
                                            `}
                                        >
                                            {t === "classic" && <FileText className="w-6 h-6" />}
                                            {t === "modern" && <Layers className="w-6 h-6" />}
                                            {t === "minimal" && <LayoutTemplate className="w-6 h-6" />}

                                            <span className="text-xs font-medium">
                                                {t === "classic" ? "كلاسيكي" : t === "modern" ? "عصري" : "بسيط"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Branding Layout */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-theme-strong flex items-center gap-2">
                                    <Type className="w-4 h-4 text-theme-subtle" />
                                    بيانات المنشأة
                                </label>

                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs text-theme-subtle mb-1 block">اسم الشركة</span>
                                        <input
                                            value={config.companyName}
                                            onChange={(e) => updateConfig("companyName", e.target.value)}
                                            className="input-dark w-full rounded-lg px-3 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs text-theme-subtle mb-1 block">الشعار اللفظي (Slogan)</span>
                                        <input
                                            value={config.tagline}
                                            onChange={(e) => updateConfig("tagline", e.target.value)}
                                            className="input-dark w-full rounded-lg px-3 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs text-theme-subtle mb-1 block">الرقم الضريبي (اختياري)</span>
                                        <input
                                            value={config.vatNumber}
                                            onChange={(e) => updateConfig("vatNumber", e.target.value)}
                                            className="input-dark w-full rounded-lg px-3 py-2.5 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Colors & Typography */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-theme-strong mb-3 block flex items-center gap-2">
                                        <Palette className="w-4 h-4 text-theme-subtle" />
                                        الألوان
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={config.primaryColor}
                                                onChange={(e) => updateConfig("primaryColor", e.target.value)}
                                                className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                                            />
                                            <span className="text-xs text-theme-soft">الأساسي</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={config.accentColor}
                                                onChange={(e) => updateConfig("accentColor", e.target.value)}
                                                className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                                            />
                                            <span className="text-xs text-theme-soft">التمييز</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-theme-strong mb-3 block flex items-center gap-2">
                                        <Type className="w-4 h-4 text-theme-subtle" />
                                        الخط المعروض
                                    </label>
                                    <select
                                        value={config.fontFamily}
                                        onChange={(e) => updateConfig("fontFamily", e.target.value)}
                                        className="input-dark w-full rounded-lg px-3 py-2.5 text-sm appearance-none"
                                    >
                                        <option value="IBM Plex Sans Arabic">IBM Plex Sans</option>
                                        <option value="Cairo">Cairo</option>
                                        <option value="Tajawal">Tajawal</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes & Checkboxes */}
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-theme-subtle mb-1 block">ملاحظات / الشروط والأحكام</span>
                                    <textarea
                                        value={config.notes}
                                        onChange={(e) => updateConfig("notes", e.target.value)}
                                        rows={4}
                                        className="input-dark w-full rounded-lg px-3 py-2.5 text-sm resize-none"
                                    />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-theme-subtle bg-theme-faint group-hover:border-gold/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config.showLogo}
                                                onChange={(e) => updateConfig("showLogo", e.target.checked)}
                                                className="opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            {config.showLogo && <div className="w-2.5 h-2.5 rounded-sm bg-gold" />}
                                        </div>
                                        <span className="text-sm text-theme-strong select-none">إظهار شعار المنصة (Logo)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-theme-subtle bg-theme-faint group-hover:border-gold/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config.showWatermark}
                                                onChange={(e) => updateConfig("showWatermark", e.target.checked)}
                                                className="opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            {config.showWatermark && <div className="w-2.5 h-2.5 rounded-sm bg-gold" />}
                                        </div>
                                        <span className="text-sm text-theme-strong select-none">إظهار العلامة المائية (Watermark)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-theme-subtle bg-theme-faint group-hover:border-gold/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config.showTax}
                                                onChange={(e) => updateConfig("showTax", e.target.checked)}
                                                className="opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            {config.showTax && <div className="w-2.5 h-2.5 rounded-sm bg-gold" />}
                                        </div>
                                        <span className="text-sm text-theme-strong select-none">إضافة ضريبة القيمة المضافة (VAT)</span>
                                    </label>

                                    {config.showTax && (
                                        <div className="mr-8 mt-1">
                                            <span className="text-xs text-theme-subtle mb-1 block">نسبة الضريبة %</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                            value={config.taxRate}
                                            onChange={(e) => updateConfig("taxRate", Number(e.target.value))}
                                                className="input-dark w-28 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column Settings */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-theme-strong flex items-center gap-2">
                                    <LayoutTemplate className="w-4 h-4 text-theme-subtle" />
                                    أعمدة الفاتورة (لإخفائها)
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-theme-subtle bg-theme-faint group-hover:border-gold/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config.hiddenColumns?.quantity || false}
                                                onChange={(e) => updateHiddenColumn("quantity", e.target.checked)}
                                                className="opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            {config.hiddenColumns?.quantity && <div className="w-2.5 h-2.5 rounded-sm bg-gold" />}
                                        </div>
                                        <span className="text-sm text-theme-strong select-none text-red-400">إخفاء عمود {"\"الكمية\""}</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-theme-subtle bg-theme-faint group-hover:border-gold/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config.hiddenColumns?.unitPrice || false}
                                                onChange={(e) => updateHiddenColumn("unitPrice", e.target.checked)}
                                                className="opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            {config.hiddenColumns?.unitPrice && <div className="w-2.5 h-2.5 rounded-sm bg-gold" />}
                                        </div>
                                        <span className="text-sm text-theme-strong select-none text-red-400">إخفاء عمود {"\"سعر الوحدة\""}</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 rounded border border-theme-subtle bg-theme-faint group-hover:border-gold/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config.hiddenColumns?.subtotal || false}
                                                onChange={(e) => updateHiddenColumn("subtotal", e.target.checked)}
                                                className="opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            {config.hiddenColumns?.subtotal && <div className="w-2.5 h-2.5 rounded-sm bg-gold" />}
                                        </div>
                                        <span className="text-sm text-theme-strong select-none text-red-400">إخفاء عمود {"\"الإجمالي\""}</span>
                                    </label>
                                </div>
                            </div>

                        </div>

                        {/* Bottom Action Bar */}
                        <div className="absolute bottom-0 left-0 right-0 border-t border-theme-subtle bg-theme-faint p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.12)]">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveConfig}
                                    className="flex-1 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-bold text-theme transition-all hover:bg-[color:var(--surface-elevated)] flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4 text-theme-soft" />
                                    حفظ كافتراضي
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 rounded-xl bg-gradient-to-l from-gold to-gold-light px-4 py-3 text-sm font-bold text-[var(--wusha-bg)] shadow-[0_4px_15px_rgba(206,174,127,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_25px_rgba(206,174,127,0.5)] flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    تصدير PDF / طباعة
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT PANEL: LIVE PREVIEW ─── */}
                    <div className="relative flex flex-1 items-center justify-center bg-theme-faint p-8">
                        {/* Background pattern */}
                        <div className="absolute inset-0 pattern-dots opacity-5 pointer-events-none" />

                        <div className="w-full max-w-[800px] h-full bg-white rounded-lg shadow-2xl relative overflow-hidden flex flex-col group">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none" />
                            <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/80 backdrop-blur text-theme text-[10px] font-bold tracking-widest uppercase rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Live Preview
                            </div>

                            <iframe
                                ref={iframeRef}
                                srcDoc={previewHtml}
                                className="w-full flex-1 border-none bg-white"
                                title="Invoice Preview"
                            />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
