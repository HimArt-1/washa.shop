"use client";

import { useState, useRef } from "react";
import { Plus, Search, Loader2, QrCode, Printer, X } from "lucide-react";
import Image from "next/image";
import { createSKU } from "@/app/actions/erp/inventory";
import { createClient } from "@supabase/supabase-js";
import Barcode from 'react-barcode';

export default function BarcodesClient({ initialSKUs }: { initialSKUs: any[] }) {
    const [skus, setSkus] = useState(initialSKUs);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [printSku, setPrintSku] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Form State
    const [selectedProductId, setSelectedProductId] = useState("");
    const [size, setSize] = useState("");
    const [colorCode, setColorCode] = useState("");
    const [customSku, setCustomSku] = useState("");

    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        const { data, error } = await supabase.from("products").select("id, title, type, image_url").order("created_at", { ascending: false });
        if (data) setProducts(data);
        if (error) {
            setActionError(error.message);
        }
        setLoadingProducts(false);
    };

    const handleOpenAdd = () => {
        setActionError(null);
        setIsAdding(true);
        fetchProducts();
    };

    const resetForm = () => {
        setSelectedProductId("");
        setSize("");
        setColorCode("");
        setCustomSku("");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        setIsSaving(true);

        try {
            const { sku, error } = await createSKU({
                product_id: selectedProductId,
                sku: customSku.trim() || undefined,
                size: size || null,
                color_code: colorCode || null
            });

            if (error) {
                setActionError(error);
            } else if (sku) {
                const selectedProduct = products.find((product) => product.id === selectedProductId);
                setSkus((current) => [
                    {
                        ...sku,
                        product: selectedProduct ?? null,
                    },
                    ...current,
                ]);
                resetForm();
                setIsAdding(false);
            }
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "تعذر إنشاء الباركود الآن.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredSkus = skus.filter(s =>
        s.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.product?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePrintSticker = () => {
        if (!printSku) return;
        const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: #fff; width: 100%; height: 100%; font-family: Tahoma, sans-serif; }
                    .label-container { width: 50mm; height: 30mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; padding: 2mm; overflow: hidden; page-break-after: always; }
                    .title { font-size: 8px; font-weight: bold; margin-bottom: 2px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .meta { font-size: 7px; margin-bottom: 2px; }
                    @media print {
                        @page { size: 50mm 30mm; margin: 0; }
                        body { width: 50mm; height: 30mm; }
                    }
                </style>
            </head>
            <body>
                <div class="label-container" id="print-area">
                </div>
            </body>
            </html>
        `;

        const win = window.open("", "_blank", "width=400,height=400");
        if (win) {
            win.document.open();
            win.document.write(html);
            win.document.close();

            // Copy the react-rendered SVG into the print window
            setTimeout(() => {
                const sourceDiv = printRef.current;
                const targetDiv = win.document.getElementById('print-area');
                if (sourceDiv && targetDiv) {
                    targetDiv.innerHTML = sourceDiv.innerHTML;
                }
                win.focus();
                win.print();
            }, 500);
        }
    };

    return (
        <div className="space-y-6">
            {actionError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:px-5">
                    {actionError}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-subtle" />
                    <input
                        type="text"
                        placeholder="ابحث برقم الباركود أو اسم المنتج..."
                        className="input-dark w-full rounded-xl py-2 pl-4 pr-10 text-sm transition-colors"
                        value={searchQuery}
                        onChange={d => setSearchQuery(d.target.value)}
                    />
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 font-semibold text-[var(--wusha-bg)] transition-colors hover:bg-gold/90"
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة باركود جديد</span>
                </button>
            </div>

            {/* List */}
            <div className="theme-surface-panel overflow-hidden rounded-2xl">
                <table className="w-full text-sm text-right">
                    <thead className="bg-theme-faint text-theme-soft">
                        <tr>
                            <th className="px-6 py-4 font-medium">الباركود (SKU)</th>
                            <th className="px-6 py-4 font-medium">المنتج المرتبط</th>
                            <th className="px-6 py-4 font-medium">المقاس / اللون</th>
                            <th className="px-6 py-4 font-medium" dir="ltr">تاريخ الإضافة</th>
                            <th className="px-6 py-4 font-medium">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-faint">
                        {filteredSkus.map((sku) => (
                            <tr key={sku.id} className="hover:bg-theme-faint transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <QrCode className="w-4 h-4 text-gold" />
                                            <span className="inline-block rounded border border-theme-subtle bg-theme-faint px-2 py-1 font-mono text-theme">
                                            {sku.sku}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {sku.product?.image_url && (
                                            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                                <Image src={sku.product.image_url} alt="" fill className="object-cover" />
                                            </div>
                                        )}
                                        <span className="font-medium truncate max-w-[200px] block">
                                            {sku.product?.title || 'منتج محذوف'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2 text-xs">
                                        {sku.size && <span className="rounded-md border border-theme-subtle bg-theme-faint px-2 py-1">M: {sku.size}</span>}
                                        {sku.color_code && <span className="rounded-md border border-theme-subtle bg-theme-faint px-2 py-1">C: {sku.color_code}</span>}
                                        {!sku.size && !sku.color_code && <span className="text-theme-subtle">-</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-theme-soft text-xs text-left" dir="ltr">
                                    {new Date(sku.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => setPrintSku(sku)}
                                        className="p-2 hover:bg-gold/10 text-gold rounded-lg transition-colors"
                                        title="طباعة ملصق (Barcode Tag)"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredSkus.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-theme-subtle">
                                    لا يوجد باركودات مضافة حتى الآن أو لا توجد نتائج مطابقة للبحث.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_80%,transparent)] backdrop-blur-sm">
                    <div className="theme-surface-panel flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl">
                        <div className="flex items-center justify-between border-b border-theme-subtle bg-theme-faint p-6">
                            <h2 className="text-xl font-bold">توليد باركود جديد</h2>
                            <button onClick={() => setIsAdding(false)} className="text-theme-subtle hover:text-theme transition-colors">
                                إغلاق
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="sku-form" onSubmit={handleSave} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">اختر المنتج الأسّاسي</label>
                                    <select
                                        required
                                        className="input-dark w-full rounded-xl p-3"
                                        value={selectedProductId}
                                        onChange={e => setSelectedProductId(e.target.value)}
                                        disabled={loadingProducts}
                                    >
                                        <option value="">-- يرجى الاختيار --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} ({p.type})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-strong">المقاس (اختياري)</label>
                                        <input
                                            type="text"
                                            placeholder="مثال: XL"
                                            className="input-dark w-full rounded-xl p-3"
                                            value={size}
                                            onChange={e => setSize(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-strong">رمز اللون (اختياري)</label>
                                        <input
                                            type="text"
                                            placeholder="مثال: blu"
                                            className="input-dark w-full rounded-xl p-3"
                                            value={colorCode}
                                            onChange={e => setColorCode(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-theme-faint">
                                    <label className="text-sm font-medium text-gold flex items-center gap-2">
                                        <QrCode className="w-4 h-4" />
                                        <span>الرقم التسلسلي المقترح (SKU)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="input-dark w-full rounded-xl border-gold/20 p-3 font-mono text-gold placeholder:text-gold/30"
                                            value={customSku}
                                            placeholder="اتركه فارغاً للتوليد التلقائي (WSH-P-00001-NA-NA)"
                                            onChange={e => setCustomSku(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-theme-subtle leading-relaxed">
                                        هذا الرقم هو الذي سيتم استخدامه لربط المنتج في المستودع والمبيعات وقراءة الباركود اليدوية.
                                    </p>
                                </div>
                            </form>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-theme-subtle bg-theme-faint p-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false);
                                    setActionError(null);
                                    resetForm();
                                }}
                                className="px-5 py-2.5 rounded-xl font-medium border border-theme-soft hover:bg-theme-subtle transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                form="sku-form"
                                disabled={isSaving || !selectedProductId}
                                className="flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 font-medium text-[var(--wusha-bg)] transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                حفظ وإنشاء الباركود
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Preview Modal */}
            {printSku && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_80%,transparent)] backdrop-blur-sm">
                    <div className="theme-surface-panel relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-theme-subtle bg-theme-faint p-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <Printer className="w-4 h-4 text-gold" />
                                طباعة ملصق (50x30mm)
                            </h3>
                            <button onClick={() => setPrintSku(null)} className="text-theme-subtle hover:text-theme transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 flex flex-col items-center justify-center bg-theme-faint">
                            {/* Hidden container where we construct the DOM for printing */}
                            <div className="hidden">
                                <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50mm', height: '30mm', overflow: 'hidden' }}>
                                    <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '2px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {printSku.product?.title || 'WASHA Product'}
                                    </div>
                                    {(printSku.size || printSku.color_code) && (
                                        <div style={{ fontSize: '7px', marginBottom: '2px' }}>
                                            {printSku.size ? `Size: ${printSku.size} ` : ''}
                                            {printSku.color_code ? `Color: ${printSku.color_code}` : ''}
                                        </div>
                                    )}
                                    <Barcode value={printSku.sku} format="CODE128" width={1.2} height={30} displayValue={true} fontSize={10} background="transparent" margin={0} />
                                </div>
                            </div>

                            {/* Visible Preview of the tag */}
                            <div className="bg-white text-black p-4 rounded-lg shadow-inner flex flex-col items-center w-[50mm] min-h-[30mm] transform scale-[1.5] origin-top my-4 pointer-events-none">
                                <div className="text-[8px] font-bold mb-[2px] text-center w-full truncate">
                                    {printSku.product?.title || 'WASHA Product'}
                                </div>
                                {(printSku.size || printSku.color_code) && (
                                    <div className="text-[7px] mb-[2px] text-center w-full">
                                        {printSku.size ? `Size: ${printSku.size} ` : ''}
                                        {printSku.color_code ? `Color: ${printSku.color_code}` : ''}
                                    </div>
                                )}
                                <div className="flex-1 flex items-center justify-center -mt-2">
                                    <Barcode value={printSku.sku} format="CODE128" width={1.2} height={30} displayValue={true} fontSize={10} background="transparent" margin={0} />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-theme-subtle bg-theme-faint p-4">
                            <button
                                onClick={handlePrintSticker}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-bold text-[var(--wusha-bg)] shadow-lg transition-colors hover:bg-gold/90"
                            >
                                <Printer className="w-5 h-5" />
                                إرسال للطابعة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
