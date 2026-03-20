"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ArrowLeft, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2, Pencil, Plus, Trash2, Check } from "lucide-react";
import Papa from "papaparse";
import { processSmartImport } from "@/app/actions/erp/inventory-import";

interface SmartImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "success" | "error";

interface MappedColumn {
    header: string;
    dbField: string | null;
    isCustom?: boolean;
    defaultValue?: string;
    renamedHeader?: string;
}

// ─── Smart Column Detector ────────────────────────────────────
function autoMapHeader(header: string): string {
    const h = header.toLowerCase().trim();

    // Product title
    if (h.includes("منتج") || h.includes("اسم المنتج") || h.includes("اسم") || h === "title" || h === "name" || h === "product" || h === "المنتج") return "title";

    // Store
    if (h.includes("متجر") || h.includes("محل") || h === "store" || h === "shop" || h === "brand") return "store";

    // Price
    if (h.includes("سعر") || h.includes("ثمن") || h.includes("price") || h.includes("cost") || h.includes("ريال") || h.includes("sar")) return "price";

    // Type
    if (h.includes("نوع") || h.includes("صنف") || h === "type" || h === "category" || h === "cat") return "type";

    // Total / Grand sum
    if (h.includes("مجموع") || h.includes("إجمالي") || h.includes("اجمالي") || h.includes("الكلي") || h === "total" || h === "sum" || h === "all") return "total";

    // Sizes — exact + Arabic aliases
    // XS
    if (h === "xs" || h === "extra small" || h === "extra-small" || h === "صغير جداً" || h === "صغير جدا" || h === "صغيرجدا" || h === "xs مقاس") return "size_xs";
    // S
    if (h === "s" || h === "small" || h === "صغير" || h === "صغيرة" || h === "s مقاس") return "size_s";
    // M
    if (h === "m" || h === "medium" || h === "med" || h === "وسط" || h === "متوسط" || h === "وسيط" || h === "m مقاس") return "size_m";
    // L
    if (h === "l" || h === "large" || h === "كبير" || h === "كبيرة" || h === "l مقاس") return "size_l";
    // XL
    if (h === "xl" || h === "extra large" || h === "extra-large" || h === "xlarge" || h === "كبير جداً" || h === "كبير جدا" || h === "كبيرجدا" || h === "xl مقاس") return "size_xl";
    // XXL
    if (h === "xxl" || h === "2xl" || h === "2x" || h === "2xlarge" || h === "2x large" || h === "كبير جداً ٢" || h === "xxl مقاس") return "size_xxl";
    // XXXL
    if (h === "xxxl" || h === "3xl" || h === "3x" || h === "3xlarge" || h === "3x large" || h === "xxxl مقاس") return "size_xxxl";
    // XXXXL
    if (h === "xxxxl" || h === "4xl" || h === "4x" || h === "4xlarge" || h === "4x large" || h === "xxxxl مقاس") return "size_xxxxl";

    return "ignore";
}

export function SmartImportModal({ isOpen, onClose, onSuccess }: SmartImportModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [fileOptions, setFileOptions] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappedColumns, setMappedColumns] = useState<MappedColumn[]>([]);
    const [importResult, setImportResult] = useState<{ success: number; errors: number; log: string[] } | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColName, setNewColName] = useState("");
    const [newColField, setNewColField] = useState("ignore");
    const [newColDefault, setNewColDefault] = useState("");

    const dbFields = [
        { id: "ignore", label: "تجاهل هذا العمود" },
        { id: "title", label: "اسم المنتج" },
        { id: "type", label: "نوع المنتج (apparel/print/...)" },
        { id: "price", label: "السعر الأساسي" },
        { id: "store", label: "اسم المتجر" },
        { id: "size_xs", label: "مخزون مقاس XS" },
        { id: "size_s", label: "مخزون مقاس S" },
        { id: "size_m", label: "مخزون مقاس M" },
        { id: "size_l", label: "مخزون مقاس L" },
        { id: "size_xl", label: "مخزون مقاس XL" },
        { id: "size_xxl", label: "مخزون مقاس XXL" },
        { id: "size_xxxl", label: "مخزون مقاس XXXL" },
        { id: "size_xxxxl", label: "مخزون مقاس XXXXL" },
        { id: "total", label: "المجموع الكلي" },
    ];

    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStep("upload");
        setFileOptions(null);
        setParsedData([]);
        setHeaders([]);
        setMappedColumns([]);
        setImportResult(null);
        setParseError(null);
        setEditingIndex(null);
        setShowAddColumn(false);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileOptions(file);
        setParseError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                if (data.length > 0) {
                    const extractedHeaders = Object.keys(data[0]);
                    setHeaders(extractedHeaders);

                    const autoMapped = extractedHeaders.map(header => ({
                        header,
                        dbField: autoMapHeader(header),
                    }));

                    setMappedColumns(autoMapped);
                    setParsedData(data);
                    setStep("mapping");
                }
            },
            error: (error) => {
                setParseError("حدث خطأ أثناء قراءة الملف. يرجى التأكد من أنه ملف CSV صالح.");
                console.error(error);
            }
        });
    };

    const handleRenameStart = (index: number) => {
        setEditingIndex(index);
        setEditingName(mappedColumns[index].renamedHeader || mappedColumns[index].header);
    };

    const handleRenameConfirm = () => {
        if (editingIndex === null || !editingName.trim()) return;
        const updated = [...mappedColumns];
        updated[editingIndex].renamedHeader = editingName.trim();
        setMappedColumns(updated);
        setEditingIndex(null);
        setEditingName("");
    };

    const handleDeleteColumn = (index: number) => {
        setMappedColumns(mappedColumns.filter((_, i) => i !== index));
    };

    const handleAddColumn = () => {
        if (!newColName.trim()) return;
        setMappedColumns([...mappedColumns, {
            header: newColName.trim(),
            dbField: newColField,
            isCustom: true,
            defaultValue: newColDefault.trim(),
        }]);
        setNewColName(""); setNewColField("ignore"); setNewColDefault(""); setShowAddColumn(false);
    };

    const executeImport = async () => {
        setStep("importing");
        try {
            const payload = parsedData.map(row => {
                const obj: any = {};
                mappedColumns.forEach(map => {
                    if (map.dbField && map.dbField !== "ignore") {
                        obj[map.dbField] = map.isCustom ? (map.defaultValue || "") : row[map.header];
                    }
                });
                return obj;
            });

            const validPayload = payload.filter(p => !!p.title);
            if (validPayload.length === 0) {
                setStep("error");
                setImportResult({ success: 0, errors: payload.length, log: ["لم يتم العثور على عمود (اسم المنتج). إنه إلزامي."] });
                return;
            }

            const result = await processSmartImport(validPayload);
            if (result.success) {
                setImportResult({
                    success: result.insertedCount || validPayload.length,
                    errors: result.errors?.length || 0,
                    log: result.errors || [],
                });
                setStep(result.errors && result.errors.length > 0 ? "error" : "success");
            } else {
                setStep("error");
                setImportResult({ success: 0, errors: validPayload.length, log: [result.error || "توقف غير متوقع"] });
            }
        } catch (error: any) {
            setStep("error");
            setImportResult({ success: 0, errors: 1, log: [error.message] });
        }
    };

    if (!isOpen) return null;

    const getDisplayName = (col: MappedColumn) => col.renamedHeader || col.header;

    // Count auto-detected fields for user feedback
    const detectedCount = mappedColumns.filter(c => !c.isCustom && c.dbField !== "ignore").length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_80%,transparent)] backdrop-blur-md p-4"
                dir="rtl"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-theme-surface border border-theme-soft rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-theme-faint bg-theme-bg">
                        <div>
                            <h2 className="text-2xl font-black text-theme">استيراد CSV — المنتجات</h2>
                            <p className="text-theme-subtle text-sm">استيراد منتجات ومقاسات بالجملة عبر جداول CSV</p>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-theme-faint rounded-full transition-colors text-theme-subtle">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-wusha">

                        {/* STEP 1: UPLOAD */}
                        {step === "upload" && (
                            <div className="h-full flex flex-col items-center justify-center py-20">
                                {parseError && (
                                    <div className="mb-6 w-full max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                        {parseError}
                                    </div>
                                )}
                                <FileSpreadsheet className="w-20 h-20 text-gold mb-6 opacity-50" />
                                <h3 className="text-2xl font-bold text-theme mb-2">ارفع جدول المنتجات</h3>
                                <p className="text-theme-subtle max-w-md text-center mb-8">
                                    قم برفع ملف CSV يحتوي على قائمة المنتجات وتوزيع المقاسات.
                                    سيتم كشف الأعمدة وربطها تلقائياً.
                                </p>
                                <div className="mb-6 p-4 rounded-xl bg-gold/5 border border-gold/15 text-xs text-theme-subtle max-w-md w-full">
                                    <p className="font-bold text-gold mb-2">أعمدة يتم كشفها تلقائياً:</p>
                                    <div className="grid grid-cols-2 gap-1">
                                        <span>• المنتج / title / name</span>
                                        <span>• سعر / price</span>
                                        <span>• S, M, L, XL, XXL...</span>
                                        <span>• صغير، وسط، كبير...</span>
                                        <span>• متجر / store</span>
                                        <span>• مجموع / total</span>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-8 py-4 bg-gold text-black rounded-xl font-bold hover:bg-gold/90 transition-colors flex items-center gap-3 shadow-[0_10px_30px_-10px_rgba(202,160,82,0.4)]"
                                >
                                    <Upload className="w-5 h-5" />
                                    اختيار ملف CSV
                                </button>
                            </div>
                        )}

                        {/* STEP 2: MAPPING */}
                        {step === "mapping" && (
                            <div className="space-y-6">
                                <div className="bg-gold/10 border border-gold/20 p-4 rounded-xl flex items-start gap-4 text-gold">
                                    <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold">مطابقة الأعمدة</h4>
                                        <p className="text-sm opacity-80 mt-1">
                                            وجدنا <strong>{mappedColumns.filter(c => !c.isCustom).length}</strong> عمود في الجدول،
                                            تم ربط <strong>{detectedCount}</strong> منها تلقائياً.
                                            يمكنك تعديل الربط، حذف عمود، أو إضافة عمود بقيمة ثابتة.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mappedColumns.map((col, index) => (
                                        <div key={index} className={`bg-theme-bg p-4 rounded-xl border ${col.isCustom ? 'border-gold/30 bg-gold/[0.03]' : col.dbField !== 'ignore' ? 'border-gold/20' : 'border-theme-faint'} relative group`}>
                                            {/* Auto-detected badge */}
                                            {!col.isCustom && col.dbField !== "ignore" && (
                                                <span className="absolute top-2 right-2 text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-bold">تم الكشف</span>
                                            )}

                                            {/* Delete button */}
                                            <button
                                                onClick={() => handleDeleteColumn(index)}
                                                className="absolute top-2 left-2 p-1.5 rounded-lg text-theme-faint hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                title="حذف العمود"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>

                                            <p className="text-xs text-theme-subtle font-mono mb-1 mt-4">
                                                {col.isCustom ? "عمود مُضاف يدوياً:" : "عمود الجدول:"}
                                            </p>

                                            {editingIndex === index ? (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <input
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
                                                        className="flex-1 px-2 py-1.5 bg-theme-subtle border border-gold/30 rounded-lg text-sm text-theme font-bold focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleRenameConfirm} className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingIndex(null)} className="p-1.5 rounded-lg text-theme-faint hover:bg-theme-subtle">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <p className="font-bold text-theme text-lg truncate flex-1" title={getDisplayName(col)}>
                                                        {getDisplayName(col)}
                                                    </p>
                                                    {!col.isCustom && (
                                                        <button
                                                            onClick={() => handleRenameStart(index)}
                                                            className="p-1.5 rounded-lg text-theme-faint hover:text-gold hover:bg-gold/10 opacity-0 group-hover:opacity-100 transition-all"
                                                            title="تعديل الاسم"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {col.renamedHeader && !col.isCustom && (
                                                <p className="text-[10px] text-theme-faint mb-2 font-mono">الأصلي: {col.header}</p>
                                            )}

                                            <p className="text-xs text-gold mb-1">يُسجل في قاعدة البيانات كـ:</p>
                                            <select
                                                value={col.dbField || "ignore"}
                                                onChange={(e) => {
                                                    const newMappings = [...mappedColumns];
                                                    newMappings[index].dbField = e.target.value;
                                                    setMappedColumns(newMappings);
                                                }}
                                                className="w-full bg-theme-surface border border-theme-soft rounded-lg px-3 py-2 text-sm text-theme focus:ring-1 focus:ring-gold outline-none"
                                            >
                                                {dbFields.map(field => (
                                                    <option key={field.id} value={field.id}>{field.label}</option>
                                                ))}
                                            </select>

                                            {col.isCustom && (
                                                <div className="mt-3">
                                                    <p className="text-xs text-theme-subtle mb-1">القيمة الافتراضية:</p>
                                                    <input
                                                        value={col.defaultValue || ""}
                                                        onChange={(e) => {
                                                            const updated = [...mappedColumns];
                                                            updated[index].defaultValue = e.target.value;
                                                            setMappedColumns(updated);
                                                        }}
                                                        className="w-full px-3 py-2 bg-theme-subtle border border-theme-soft rounded-lg text-sm text-theme focus:outline-none focus:border-gold/30"
                                                        placeholder="مثال: 100"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Column Card */}
                                    {!showAddColumn ? (
                                        <button
                                            onClick={() => setShowAddColumn(true)}
                                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-theme-faint hover:border-gold/40 text-theme-faint hover:text-gold transition-all min-h-[160px]"
                                        >
                                            <Plus className="w-8 h-8" />
                                            <span className="text-sm font-bold">إضافة عمود</span>
                                        </button>
                                    ) : (
                                        <div className="bg-gold/[0.03] p-4 rounded-xl border border-gold/20 space-y-3">
                                            <p className="text-sm font-bold text-gold">عمود جديد</p>
                                            <div>
                                                <p className="text-xs text-theme-subtle mb-1">اسم العمود</p>
                                                <input
                                                    value={newColName}
                                                    onChange={(e) => setNewColName(e.target.value)}
                                                    placeholder="مثال: السعر الثابت"
                                                    className="w-full px-3 py-2 bg-theme-subtle border border-theme-soft rounded-lg text-sm text-theme focus:outline-none focus:border-gold/30"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <p className="text-xs text-theme-subtle mb-1">يُسجل كـ:</p>
                                                <select
                                                    value={newColField}
                                                    onChange={(e) => setNewColField(e.target.value)}
                                                    className="w-full bg-theme-surface border border-theme-soft rounded-lg px-3 py-2 text-sm text-theme focus:ring-1 focus:ring-gold outline-none"
                                                >
                                                    {dbFields.map(field => (
                                                        <option key={field.id} value={field.id}>{field.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <p className="text-xs text-theme-subtle mb-1">القيمة الافتراضية لجميع الصفوف</p>
                                                <input
                                                    value={newColDefault}
                                                    onChange={(e) => setNewColDefault(e.target.value)}
                                                    placeholder="مثال: 150"
                                                    className="w-full px-3 py-2 bg-theme-subtle border border-theme-soft rounded-lg text-sm text-theme focus:outline-none focus:border-gold/30"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleAddColumn}
                                                    disabled={!newColName.trim()}
                                                    className="flex-1 py-2 rounded-lg bg-gold/20 text-gold font-bold text-sm hover:bg-gold/30 disabled:opacity-40 transition-all"
                                                >
                                                    إضافة
                                                </button>
                                                <button
                                                    onClick={() => { setShowAddColumn(false); setNewColName(""); setNewColField("ignore"); setNewColDefault(""); }}
                                                    className="px-4 py-2 rounded-lg text-theme-subtle hover:bg-theme-subtle text-sm transition-colors"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PREVIEW */}
                        {step === "preview" && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-theme mb-4">نظرة عامة على البيانات</h3>
                                <p className="text-theme-subtle text-sm mb-4">يُرجى مراجعة أول 5 صفوف للتأكد من سلامة المطابقة قبل الاستيراد النهائي.</p>

                                <div className="overflow-x-auto rounded-xl border border-theme-faint">
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-theme-faint text-theme-soft font-bold text-xs uppercase">
                                            <tr>
                                                {mappedColumns.filter(m => m.dbField !== "ignore").map(m => (
                                                    <th key={getDisplayName(m)} className="px-4 py-3 border-b border-theme-soft/50">
                                                        <div>
                                                            <span>{dbFields.find(db => db.id === m.dbField)?.label || m.dbField}</span>
                                                            {m.isCustom && <span className="text-gold text-[9px] block mt-0.5">قيمة ثابتة</span>}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-theme-faint text-theme bg-theme-bg">
                                            {parsedData.slice(0, 5).map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-theme-faint/30">
                                                    {mappedColumns.filter(m => m.dbField !== "ignore").map(m => (
                                                        <td key={getDisplayName(m)} className="px-4 py-3 truncate max-w-[200px]" title={m.isCustom ? m.defaultValue : row[m.header]}>
                                                            {m.isCustom
                                                                ? <span className="text-gold/70 italic">{m.defaultValue || "—"}</span>
                                                                : (row[m.header] || <span className="text-theme-faint italic">-</span>)
                                                            }
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-theme-subtle text-center">يتم عرض أول 5 من أصل {parsedData.length} منتج للإطلاع فقط.</p>
                            </div>
                        )}

                        {/* IMPORTING */}
                        {step === "importing" && (
                            <div className="h-full flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="w-16 h-16 text-gold animate-spin" />
                                <h3 className="text-xl font-bold text-theme">جاري معالجة الاستيراد...</h3>
                                <p className="text-theme-subtle">الرجاء عدم إغلاق هذه النافذة حتى الانتهاء.</p>
                            </div>
                        )}

                        {/* RESULTS */}
                        {(step === "success" || step === "error") && importResult && (
                            <div className="flex flex-col items-center py-8 space-y-6 w-full">
                                {/* Status icon + counts */}
                                <div className="flex flex-col items-center gap-4">
                                    {step === "success" ? (
                                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-10 h-10 text-green-500" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                                            <AlertTriangle className="w-10 h-10 text-amber-400" />
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <h3 className="text-xl font-black text-theme mb-2">
                                            {step === "success" ? "تم الاستيراد بنجاح!" : "تم الاستيراد مع وجود بعض الأخطاء"}
                                        </h3>
                                        <div className="flex items-center justify-center gap-6 opacity-80">
                                            <div className="text-green-400 font-mono text-lg">{importResult.success} <span className="text-sm font-sans">ناجح</span></div>
                                            <div className="text-red-400 font-mono text-lg">{importResult.errors} <span className="text-sm font-sans">أخطاء</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Post-import summary table */}
                                {parsedData.length > 0 && (
                                    <div className="w-full space-y-2">
                                        <p className="text-xs text-theme-subtle font-bold">جدول الاستيراد — ما تم رفعه:</p>
                                        <div className="overflow-x-auto rounded-xl border border-theme-faint max-h-[280px] overflow-y-auto">
                                            <table className="w-full text-xs text-right whitespace-nowrap">
                                                <thead className="bg-theme-subtle text-theme-soft sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-3 py-2.5 font-bold">#</th>
                                                        {mappedColumns.filter(m => m.dbField !== "ignore").map(m => (
                                                            <th key={m.header} className="px-3 py-2.5 font-bold">
                                                                {dbFields.find(d => d.id === m.dbField)?.label || m.dbField}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-theme-faint">
                                                    {parsedData.map((row, i) => (
                                                        <tr key={i} className={`hover:bg-theme-faint/40 ${!row[mappedColumns.find(m => m.dbField === "title")?.header || ""] ? "opacity-50" : ""}`}>
                                                            <td className="px-3 py-2 text-theme-faint font-mono">{i + 1}</td>
                                                            {mappedColumns.filter(m => m.dbField !== "ignore").map(m => {
                                                                const val = m.isCustom ? m.defaultValue : row[m.header];
                                                                const isSize = m.dbField?.startsWith("size_");
                                                                const isTitle = m.dbField === "title";
                                                                return (
                                                                    <td key={m.header} className={`px-3 py-2 ${isTitle ? "font-medium text-theme" : isSize ? "text-center font-mono text-gold" : "text-theme-subtle"}`}>
                                                                        {val || <span className="text-theme-faint italic">—</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Error log */}
                                {importResult.log && importResult.log.length > 0 && (
                                    <div className="w-full bg-red-500/5 border border-red-500/20 rounded-xl p-4 max-h-[120px] overflow-y-auto font-mono text-xs text-red-400 text-left dir-ltr">
                                        {importResult.log.map((log, i) => <div key={i}>{log}</div>)}
                                    </div>
                                )}

                                <button
                                    onClick={() => { onSuccess(); onClose(); }}
                                    className="btn-gold px-10 py-3 rounded-full font-bold"
                                >
                                    إغلاق وتحديث اللوحة
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer Nav */}
                    {(step === "mapping" || step === "preview") && (
                        <div className="p-6 border-t border-theme-faint bg-theme-bg flex justify-between">
                            <button
                                onClick={() => setStep(step === "preview" ? "mapping" : "upload")}
                                className="px-6 py-2.5 rounded-xl font-bold text-theme-subtle hover:bg-theme-faint transition-colors"
                            >
                                رجوع
                            </button>
                            {step === "mapping" ? (
                                <button
                                    onClick={() => setStep("preview")}
                                    className="px-6 py-2.5 bg-theme-faint text-theme rounded-xl font-bold hover:bg-theme-soft transition-colors flex items-center gap-2"
                                >
                                    مراجعة ومعاينة <ArrowLeft className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={executeImport}
                                    className="px-8 py-2.5 bg-gold text-black rounded-xl font-bold hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
                                >
                                    تأكيد وبدء الاستيراد
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
