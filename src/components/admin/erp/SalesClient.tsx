"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Loader2, DollarSign, Store, Computer, TrendingUp, ShoppingBag, BarChart2 } from "lucide-react";
import { recordManualSale } from "@/app/actions/erp/sales";

type Period = "today" | "week" | "month" | "all";

function filterByPeriod(sales: any[], period: Period) {
    if (period === "all") return sales;
    const now = new Date();
    const start = new Date();
    if (period === "today") { start.setHours(0, 0, 0, 0); }
    else if (period === "week") { start.setDate(now.getDate() - 7); }
    else if (period === "month") { start.setDate(now.getDate() - 30); }
    return sales.filter(s => new Date(s.created_at) >= start);
}

export default function SalesClient({
    initialSales, warehouses, skus
}: {
    initialSales: any[], warehouses: any[], skus: any[]
}) {
    const [sales] = useState(initialSales);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSelling, setIsSelling] = useState(false);
    const [period, setPeriod] = useState<Period>("month");

    // Form State
    const [selectedSkuId, setSelectedSkuId] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || "");
    const [quantity, setQuantity] = useState(1);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [notes, setNotes] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    // ── Analytics ──────────────────────────────────────────────
    const filteredByPeriod = useMemo(() => filterByPeriod(sales, period), [sales, period]);

    const stats = useMemo(() => {
        const totalRevenue = filteredByPeriod.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
        const totalItems = filteredByPeriod.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
        const aov = filteredByPeriod.length > 0 ? totalRevenue / filteredByPeriod.length : 0;

        // By channel
        const online = filteredByPeriod.filter(r => r.sales_method === "online_store");
        const booth = filteredByPeriod.filter(r => r.sales_method !== "online_store");
        const onlineRevenue = online.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
        const boothRevenue = booth.reduce((s, r) => s + (Number(r.total_price) || 0), 0);

        // Top 5 products
        const byProduct: Record<string, { title: string; revenue: number; qty: number }> = {};
        filteredByPeriod.forEach(r => {
            const title = r.sku?.product?.title || "غير محدد";
            const id = r.sku?.product_id || title;
            if (!byProduct[id]) byProduct[id] = { title, revenue: 0, qty: 0 };
            byProduct[id].revenue += Number(r.total_price) || 0;
            byProduct[id].qty += Number(r.quantity) || 0;
        });
        const top5 = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const maxRevenue = top5[0]?.revenue || 1;

        return { totalRevenue, totalItems, aov, onlineRevenue, boothRevenue, top5, maxRevenue, totalTx: filteredByPeriod.length };
    }, [filteredByPeriod]);

    // Auto-fill suggested price when SKU is selected
    const handleSkuChange = (skuId: string) => {
        setSelectedSkuId(skuId);
        const sku = skus.find(s => s.id === skuId);
        if (sku && sku.product?.price) {
            setTotalPrice(sku.product.price * quantity);
        }
    };

    const handleQuantityChange = (q: number) => {
        setQuantity(q);
        const sku = skus.find(s => s.id === selectedSkuId);
        if (sku && sku.product?.price) {
            setTotalPrice(sku.product.price * q);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity <= 0) return alert("الكمية غير صحيحة");
        if (totalPrice < 0) return alert("السعر الإجمالي غير صحيح");

        setIsSaving(true);

        const { success, error } = await recordManualSale(
            selectedSkuId,
            quantity,
            totalPrice,
            selectedWarehouseId,
            notes
        );

        if (error) {
            alert(error);
        } else {
            window.location.reload();
        }

        setIsSaving(false);
    };

    const filteredSales = sales.filter(item =>
        item.sku?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.product?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'online_store': return <span title="المتجر الإلكتروني"><Computer className="w-4 h-4 text-emerald-400" /></span>;
            case 'booth_manual': return <span title="تسجيل يدوي (بوث)"><Store className="w-4 h-4 text-gold" /></span>;
            default: return <DollarSign className="w-4 h-4 text-theme-soft" />;
        }
    };

    const PERIODS: { id: Period; label: string }[] = [
        { id: "today", label: "اليوم" },
        { id: "week", label: "هذا الأسبوع" },
        { id: "month", label: "هذا الشهر" },
        { id: "all", label: "الكل" },
    ];

    return (
        <div className="space-y-6">

            {/* ── Date Filter ── */}
            <div className="flex flex-wrap gap-2">
                {PERIODS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriod(p.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${period === p.id ? "bg-gold/10 text-gold border-gold/30" : "text-theme-faint border-transparent hover:bg-theme-subtle"}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-theme-subtle border border-theme-faint">
                    <div className="flex items-center gap-2 text-theme-subtle text-xs mb-2"><DollarSign className="w-4 h-4" />إجمالي المبيعات</div>
                    <p className="text-2xl font-bold text-gold">{stats.totalRevenue.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</p>
                </div>
                <div className="p-5 rounded-2xl bg-theme-subtle border border-theme-faint">
                    <div className="flex items-center gap-2 text-theme-subtle text-xs mb-2"><ShoppingBag className="w-4 h-4" />القطع المباعة</div>
                    <p className="text-2xl font-bold text-theme">{stats.totalItems.toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-2xl bg-theme-subtle border border-theme-faint">
                    <div className="flex items-center gap-2 text-theme-subtle text-xs mb-2"><TrendingUp className="w-4 h-4" />متوسط قيمة الطلب</div>
                    <p className="text-2xl font-bold text-theme">{stats.aov.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</p>
                </div>
                <div className="p-5 rounded-2xl bg-theme-subtle border border-theme-faint">
                    <div className="flex items-center gap-2 text-theme-subtle text-xs mb-2"><BarChart2 className="w-4 h-4" />عدد المعاملات</div>
                    <p className="text-2xl font-bold text-theme">{stats.totalTx}</p>
                </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Channel Breakdown */}
                <div className="p-5 rounded-2xl bg-surface/30 border border-theme-faint">
                    <h3 className="text-sm font-bold text-theme mb-4 flex items-center gap-2"><Store className="w-4 h-4 text-gold" />المبيعات حسب القناة</h3>
                    {stats.totalRevenue > 0 ? (
                        <div className="space-y-3">
                            {[
                                { label: "المتجر الإلكتروني", value: stats.onlineRevenue, color: "bg-emerald-500" },
                                { label: "يدوي (بوث/معرض)", value: stats.boothRevenue, color: "bg-gold" },
                            ].map(ch => (
                                <div key={ch.label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-theme-soft">{ch.label}</span>
                                        <span className="font-bold text-theme">{ch.value.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</span>
                                    </div>
                                    <div className="h-2 bg-theme-faint rounded-full overflow-hidden">
                                        <div className={`h-full ${ch.color} rounded-full transition-all duration-500`} style={{ width: `${stats.totalRevenue > 0 ? (ch.value / stats.totalRevenue) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-theme-subtle text-xs text-center py-8">لا توجد بيانات</p>
                    )}
                </div>

                {/* Top 5 Products */}
                <div className="p-5 rounded-2xl bg-surface/30 border border-theme-faint">
                    <h3 className="text-sm font-bold text-theme mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" />أفضل 5 منتجات</h3>
                    {stats.top5.length > 0 ? (
                        <div className="space-y-3">
                            {stats.top5.map((p, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-theme-soft truncate max-w-[60%]">{p.title}</span>
                                        <span className="font-bold text-gold">{p.revenue.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</span>
                                    </div>
                                    <div className="h-2 bg-theme-faint rounded-full overflow-hidden">
                                        <div className="h-full bg-gold/60 rounded-full transition-all duration-500" style={{ width: `${(p.revenue / stats.maxRevenue) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-theme-subtle text-xs text-center py-8">لا توجد بيانات</p>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-subtle" />
                    <input
                        type="text"
                        placeholder="ابحث في سجل المبيعات..."
                        className="w-full pl-4 pr-10 py-2 bg-surface/50 border border-theme-soft rounded-xl text-sm focus:outline-none focus:border-gold/50 transition-colors"
                        value={searchQuery}
                        onChange={d => setSearchQuery(d.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsSelling(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold text-[#0a0a0a] font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>عملية بيع جديدة (POS)</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-surface/30 border border-theme-faint rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-theme-subtle text-theme-soft">
                        <tr>
                            <th className="px-6 py-4 font-medium">طريقة البيع</th>
                            <th className="px-6 py-4 font-medium">المنتج المباع</th>
                            <th className="px-6 py-4 font-medium text-center">الكمية</th>
                            <th className="px-6 py-4 font-medium">الإجمالي</th>
                            <th className="px-6 py-4 font-medium">التاريخ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-faint">
                        {filteredSales.map((item) => (
                            <tr key={item.id} className="hover:bg-theme-faint transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getMethodIcon(item.sales_method)}
                                        <span className="text-xs">
                                            {item.sales_method === 'online_store' ? 'متجر إلكتروني' :
                                                item.sales_method === 'booth_manual' ? 'يدوي (بوث/معرض)' :
                                                    item.sales_method === 'custom_design' ? 'تصميم مخصص' : item.sales_method}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {item.sku?.product?.title ? (
                                            <>
                                                <div>
                                                    <span className="font-medium block">{item.sku.product.title}</span>
                                                    <span className="text-xs text-theme-soft font-mono mt-1 block">{item.sku.sku}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-theme-subtle italic">-- غير مرتبط بمنتج --</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-theme-subtle rounded-md border border-theme-soft">
                                        {item.quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gold">
                                    {item.total_price} ر.س
                                </td>
                                <td className="px-6 py-4 text-theme-soft text-xs text-left" dir="ltr">
                                    {new Date(item.created_at).toLocaleString('ar-SA')}
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-theme-subtle">
                                    لا توجد مبيعات مسجلة في السجل.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* POS Modal */}
            {isSelling && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_80%,transparent)] backdrop-blur-sm">
                    <div className="bg-surface border border-theme-soft rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-theme-faint flex justify-between items-center bg-theme-faint">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Store className="w-5 h-5 text-gold" />
                                تسجيل بيع يدوي جديد (بدون متجر)
                            </h2>
                            <button onClick={() => setIsSelling(false)} className="text-theme-subtle hover:text-theme transition-colors">
                                إغلاق
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="sales-form" onSubmit={handleSave} className="space-y-5">
                                <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl text-sm leading-relaxed text-gold/80">
                                    هذه الواجهة تستخدم لعمليات البيع المباشرة (نقاط البيع في البوثات/المعارض).
                                    سيتم تسجيل البيع آلياً و <strong>خصم الكمية من المستودع المختار</strong>.
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">المنتج (حدد بالباركود)</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors font-mono text-sm"
                                        value={selectedSkuId}
                                        onChange={e => handleSkuChange(e.target.value)}
                                    >
                                        <option value="">-- يرجى الاختيار --</option>
                                        {skus.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.sku} | {s.product?.title?.substring(0, 20)}...
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-strong">سحب من مستودع</label>
                                        <select
                                            required
                                            className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors text-sm"
                                            value={selectedWarehouseId}
                                            onChange={e => setSelectedWarehouseId(e.target.value)}
                                        >
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-strong">الكمية المباعة</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors text-center"
                                            value={quantity}
                                            onChange={e => handleQuantityChange(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">السعر الإجمالي (المدفوع من العميل - ر.س)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        className="w-full p-3 bg-theme-subtle border-b-2 border-transparent focus:border-gold rounded-xl outline-none transition-colors font-bold text-2xl text-gold"
                                        value={totalPrice}
                                        onChange={e => setTotalPrice(Number(e.target.value))}
                                    />
                                    <p className="text-xs text-theme-subtle">السعر يُحسب تلقائياً حسب تسعيرة المنتج ولكن يمكنك تعديله (في حال وجود خصم).</p>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <label className="text-theme-strong font-medium">ملاحظات (اختياري)</label>
                                    <textarea
                                        rows={2}
                                        className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors resize-none"
                                        placeholder="مثال: بيع من بوث معرض الرياض، الدفع كاش أو شبكة..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-theme-faint bg-theme-faint flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsSelling(false)}
                                className="px-5 py-2.5 rounded-xl font-medium border border-theme-soft hover:bg-theme-subtle transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                form="sales-form"
                                disabled={isSaving || !selectedSkuId || !selectedWarehouseId || quantity <= 0}
                                className="px-5 py-2.5 rounded-xl font-medium bg-gold text-[#0a0a0a] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                إصدار فاتورة وخصم المخزون
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
