"use client";

import { useState, useRef } from "react";
import { Plus, Search, Loader2, QrCode, Printer, X } from "lucide-react";
import Image from "next/image";
import { createSKU } from "@/app/actions/erp/inventory";
import { createClient } from "@supabase/supabase-js";
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        const { data } = await supabase.from("products").select("id, title, type").order("created_at", { ascending: false });
        if (data) setProducts(data);
        setLoadingProducts(false);
    };

    const handleOpenAdd = () => {
        setIsAdding(true);
        fetchProducts();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const { sku, error } = await createSKU({
            product_id: selectedProductId,
            sku: customSku.trim() || undefined,
            size: size || null,
            color_code: colorCode || null
        });

        if (error) {
            alert(error);
        } else if (sku) {
            window.location.reload();
        }

        setIsSaving(false);
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
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-subtle" />
                    <input
                        type="text"
                        placeholder="ابحث برقم الباركود أو اسم المنتج..."
                        className="w-full pl-4 pr-10 py-2 bg-surface/50 border border-theme-soft rounded-xl text-sm focus:outline-none focus:border-gold/50 transition-colors"
                        value={searchQuery}
                        onChange={d => setSearchQuery(d.target.value)}
                    />
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold text-black font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة باركود جديد</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-surface/30 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-theme-subtle text-theme-soft">
                        <tr>
                            <th className="px-6 py-4 font-medium">الباركود (SKU)</th>
                            <th className="px-6 py-4 font-medium">المنتج المرتبط</th>
                            <th className="px-6 py-4 font-medium">المقاس / اللون</th>
                            <th className="px-6 py-4 font-medium" dir="ltr">تاريخ الإضافة</th>
                            <th className="px-6 py-4 font-medium">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredSkus.map((sku) => (
                            <tr key={sku.id} className="hover:bg-theme-faint transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <QrCode className="w-4 h-4 text-gold" />
                                        <span className="font-mono bg-black/40 px-2 py-1 rounded inline-block text-theme border border-theme-soft">
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
                                        {sku.size && <span className="px-2 py-1 bg-theme-subtle rounded-md border border-theme-soft">M: {sku.size}</span>}
                                        {sku.color_code && <span className="px-2 py-1 bg-theme-subtle rounded-md border border-theme-soft">C: {sku.color_code}</span>}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-theme-soft rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-theme-faint">
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
                                        className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors"
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
                                            className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors"
                                            value={size}
                                            onChange={e => setSize(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-strong">رمز اللون (اختياري)</label>
                                        <input
                                            type="text"
                                            placeholder="مثال: blu"
                                            className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors"
                                            value={colorCode}
                                            onChange={e => setColorCode(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <label className="text-sm font-medium text-gold flex items-center gap-2">
                                        <QrCode className="w-4 h-4" />
                                        <span>الرقم التسلسلي المقترح (SKU)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="w-full p-3 font-mono bg-gold/5 border border-gold/20 rounded-xl text-gold focus:outline-none placeholder:text-gold/30"
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

                        <div className="p-6 border-t border-white/5 bg-theme-faint flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-5 py-2.5 rounded-xl font-medium border border-theme-soft hover:bg-theme-subtle transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                form="sku-form"
                                disabled={isSaving || !selectedProductId}
                                className="px-5 py-2.5 rounded-xl font-medium bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-theme-soft rounded-2xl w-full max-w-sm flex flex-col overflow-hidden relative shadow-2xl">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-theme-faint">
                            <h3 className="font-bold flex items-center gap-2">
                                <Printer className="w-4 h-4 text-gold" />
                                طباعة ملصق (50x30mm)
                            </h3>
                            <button onClick={() => setPrintSku(null)} className="text-theme-subtle hover:text-theme transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 flex flex-col items-center justify-center bg-black/20">
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

                        <div className="p-4 border-t border-white/5 bg-theme-faint">
                            <button
                                onClick={handlePrintSticker}
                                className="w-full py-3 rounded-xl font-bold bg-gold text-black hover:bg-gold/90 transition-colors shadow-lg flex justify-center items-center gap-2"
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
