"use client";

import { useState } from "react";
import { Plus, Search, Loader2, PackagePlus, AlertCircle } from "lucide-react";
import Image from "next/image";
import { adjustInventory } from "@/app/actions/erp/inventory";

export default function InventoryClient({
    initialInventory, warehouses, skus
}: {
    initialInventory: any[], warehouses: any[], skus: any[]
}) {
    const [inventory, setInventory] = useState(initialInventory);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);

    // Form State
    const [selectedSkuId, setSelectedSkuId] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || "");
    const [quantityToAdd, setQuantityToAdd] = useState(0);
    const [notes, setNotes] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantityToAdd === 0) return alert("الكمية يجب ألا تكون صفراً");

        setIsSaving(true);

        const { newQuantity, error } = await adjustInventory(
            selectedSkuId,
            selectedWarehouseId,
            quantityToAdd,
            quantityToAdd > 0 ? 'addition' : 'adjustment',
            notes
        );

        if (error) {
            alert(error);
        } else {
            window.location.reload();
        }

        setIsSaving(false);
    };

    const filteredInventory = inventory.filter(item =>
        item.sku?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.product?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    onClick={() => setIsAdjusting(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold text-black font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                >
                    <PackagePlus className="w-5 h-5" />
                    <span>تعديل/إضافة كمية</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-surface/30 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-theme-subtle text-theme-soft">
                        <tr>
                            <th className="px-6 py-4 font-medium">المنتج (الباركود)</th>
                            <th className="px-6 py-4 font-medium">المستودع</th>
                            <th className="px-6 py-4 font-medium text-center">الكمية المتوفرة</th>
                            <th className="px-6 py-4 font-medium">آخر تحديث</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredInventory.map((item) => (
                            <tr key={item.id} className="hover:bg-theme-faint transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {item.sku?.product?.image_url && (
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                                <Image src={item.sku.product.image_url} alt="" fill className="object-cover" />
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-medium block">{item.sku?.product?.title}</span>
                                            <span className="text-xs text-theme-soft font-mono mt-1 block">{item.sku?.sku}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-block px-3 py-1 bg-theme-subtle border border-theme-soft rounded-lg text-xs">
                                        {item.warehouse?.name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md font-bold text-sm ${item.quantity <= 5 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                        {item.quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-theme-soft text-xs text-left" dir="ltr">
                                    {new Date(item.updated_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {filteredInventory.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-theme-subtle">
                                    لم يتم رصد أي كميات في المستودعات بعد.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Adjust Modal */}
            {isAdjusting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-theme-soft rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-theme-faint">
                            <h2 className="text-xl font-bold">تعديل المخزون</h2>
                            <button onClick={() => setIsAdjusting(false)} className="text-theme-subtle hover:text-theme transition-colors">
                                إغلاق
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="inv-form" onSubmit={handleSave} className="space-y-5">
                                <AlertCircle className="w-12 h-12 text-gold/50 mx-auto border-4 border-gold/10 rounded-full p-2 mb-4" />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">المنتج المراد جردّه (الباركود)</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors font-mono text-sm"
                                        value={selectedSkuId}
                                        onChange={e => setSelectedSkuId(e.target.value)}
                                    >
                                        <option value="">-- يرجى الاختيار --</option>
                                        {skus.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.sku} | {s.product?.title?.substring(0, 20)}...
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">المستودع</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors"
                                        value={selectedWarehouseId}
                                        onChange={e => setSelectedWarehouseId(e.target.value)}
                                    >
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">كمية الإضافة/السحب (استخدم سالب - للسحب)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors text-center font-bold text-lg"
                                        value={quantityToAdd}
                                        onChange={e => setQuantityToAdd(Number(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2 text-sm">
                                    <label className="text-theme-strong font-medium">ملاحظات الجرد</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-3 bg-black/40 border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors resize-none"
                                        placeholder="مثال: توريد جديد من المصنع، إتلاف، عينة..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-theme-faint flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAdjusting(false)}
                                className="px-5 py-2.5 rounded-xl font-medium border border-theme-soft hover:bg-theme-subtle transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                form="inv-form"
                                disabled={isSaving || !selectedSkuId || !selectedWarehouseId || quantityToAdd === 0}
                                className="px-5 py-2.5 rounded-xl font-medium bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                تنفيذ الجرد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
