"use client";

import { useState } from "react";
import { Plus, Eye, Box, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import { useBooth } from "../BoothContext";
import { SIZES, fmt, pct, totalStock } from "../shared";
import { StockBadge } from "../StockBadge";
import { Panel, Field, inputCls, selectCls, KpiCard, KpiGrid, Bar, Pill, BtnPrimary, TableWrap } from "../ui";

export function StockTab() {
    const { products, stock, thresholds, addStock } = useBooth();
    const [pid, setPid] = useState(String(products[0]?.id ?? ""));
    const [size, setSize] = useState<string>("XS");
    const [qty, setQty] = useState("");
    const [thr, setThr] = useState("");
    const [viewPid, setViewPid] = useState(String(products[0]?.id ?? ""));

    const totalPieces = products.reduce((t, p) => t + totalStock(p.id, stock), 0);
    const costValue = products.reduce((t, p) => t + p.cost * totalStock(p.id, stock), 0);
    const saleValue = products.reduce((t, p) => t + p.price * totalStock(p.id, stock), 0);
    const alerts = products.filter((p) => totalStock(p.id, stock) <= (thresholds[p.id] || 5)).length;

    const onAdd = () => {
        const n = parseInt(pid);
        addStock(n, size, parseInt(qty) || 0, parseInt(thr) || thresholds[n] || 5);
        setQty("");
    };

    const viewProduct = products.find((p) => String(p.id) === viewPid) || products[0];

    return (
        <div className="space-y-3">
            <KpiGrid>
                <KpiCard icon={Box} label="إجمالي القطع" value={totalPieces} sub="في المخزون" />
                <KpiCard icon={Coins} label="قيمة بالتكلفة" value={`${fmt(costValue)} ر`} />
                <KpiCard icon={TrendingUp} label="قيمة بالبيع" value={`${fmt(saleValue)} ر`} />
                <KpiCard icon={AlertTriangle} label="تنبيهات" value={alerts} sub="منتج" />
            </KpiGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Panel title="تعبئة المخزون" icon={Plus}>
                    <div className="space-y-3">
                        <Field label="المنتج">
                            <select className={selectCls} value={pid} onChange={(e) => setPid(e.target.value)}>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="المقاس">
                                <select className={selectCls} value={size} onChange={(e) => setSize(e.target.value)}>
                                    {SIZES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="الكمية">
                                <input className={inputCls} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
                            </Field>
                        </div>
                        <Field label="حد التنبيه (قطعة)">
                            <input className={inputCls} type="number" min={1} value={thr} onChange={(e) => setThr(e.target.value)} placeholder="5" />
                        </Field>
                        <BtnPrimary onClick={onAdd}><Plus className="w-4 h-4" />إضافة للمخزون</BtnPrimary>
                    </div>
                </Panel>

                <Panel title="عرض المخزون حسب المقاس" icon={Eye}>
                    <Field label="المنتج">
                        <select className={selectCls} value={viewPid} onChange={(e) => setViewPid(e.target.value)}>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </Field>
                    <div className="mt-3 space-y-2.5">
                        {viewProduct && SIZES.map((sz) => {
                            const q = (stock[viewProduct.id] && stock[viewProduct.id][sz]) || 0;
                            const t = thresholds[viewProduct.id] || 5;
                            const pv = t ? Math.min(100, pct(q, t * 2)) : 0;
                            return (
                                <div key={sz}>
                                    <div className="flex justify-between text-xs mb-0.5">
                                        <span className="font-bold text-theme">{sz}</span>
                                        <span className="flex items-center gap-1.5 text-theme-soft">
                                            {q} قطعة
                                            {q === 0 ? <Pill tone="red">نافذ</Pill> : q <= t ? <Pill tone="amber">منخفض</Pill> : <Pill tone="forest">كافٍ</Pill>}
                                        </span>
                                    </div>
                                    <Bar value={pv} color={q === 0 ? "#e34948" : q <= t ? "#eda100" : "var(--wusha-forest)"} />
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            </div>

            <TableWrap>
                <table className="w-full text-xs min-w-[720px]">
                    <thead>
                        <tr className="bg-surface-2/50 text-theme-faint">
                            {["المنتج", "تكلفة", "سعر", ...SIZES, "الإجمالي", "الحالة"].map((h) => (
                                <th key={h} className="px-3 py-2.5 text-right font-medium whitespace-nowrap border-b border-theme-subtle">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => {
                            const tot = totalStock(p.id, stock);
                            return (
                                <tr key={p.id} className="border-b border-theme-subtle last:border-0 hover:bg-surface-2/30">
                                    <td className="px-3 py-2.5 font-bold text-theme whitespace-nowrap">{p.name}</td>
                                    <td className="px-3 py-2.5 text-theme-soft">{p.cost} ر</td>
                                    <td className="px-3 py-2.5 text-blue-400 font-bold">{p.price} ر</td>
                                    {SIZES.map((sz) => (
                                        <td key={sz} className="px-3 py-2.5 text-center text-theme-soft">{(stock[p.id] && stock[p.id][sz]) || 0}</td>
                                    ))}
                                    <td className="px-3 py-2.5 text-center font-bold text-theme">{tot}</td>
                                    <td className="px-3 py-2.5"><StockBadge pid={p.id} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableWrap>
        </div>
    );
}
