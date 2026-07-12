"use client";

import { Coins, TrendingUp, Tag, ShoppingCart, Undo2, Target, CreditCard, Shirt, Clock, AlertTriangle, Scale, CheckCircle2 } from "lucide-react";
import { useBooth, GOAL } from "../BoothContext";
import { fmt, pct, totalStock, SERIES } from "../shared";
import { Panel, KpiCard, KpiGrid, Bar, AccRow, Alert } from "../ui";

export function DashboardTab() {
    const b = useBooth();
    const { tSales, tCOGS, tExp, tRet, tDisc, netP, orders, sales, returns, discounts, products, stock, thresholds } = b;
    const goalPct = pct(tSales, GOAL);

    // توزيع الدفع
    const payMap: Record<string, number> = {};
    sales.forEach((s) => (payMap[s.pay] = (payMap[s.pay] || 0) + s.amount));

    // أعلى المنتجات
    const prodMap: Record<string, number> = {};
    sales.forEach((s) => products.forEach((p) => { if (s.detail.includes(p.name)) prodMap[p.name] = (prodMap[p.name] || 0) + s.amount; }));
    const top = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topMax = top[0]?.[1] || 1;

    // تنبيهات المخزون
    const low = products.filter((p) => totalStock(p.id, stock) <= (thresholds[p.id] || 5));

    return (
        <div className="space-y-3">
            <KpiGrid>
                <KpiCard icon={Coins} label="المبيعات" value={`${fmt(tSales)} ر`} sub="اليوم" />
                <KpiCard icon={TrendingUp} label="صافي الربح" value={`${fmt(netP)} ر`} sub={netP >= 0 ? "بعد كل التكاليف" : "خسارة"} tone={netP >= 0 ? "up" : "down"} />
                <KpiCard icon={Tag} label="الخصومات" value={`${fmt(tDisc)} ر`} sub={`${discounts.length} كوبون`} />
                <KpiCard icon={ShoppingCart} label="الطلبات" value={orders.length} sub={`${orders.filter((o) => o.status === "مكتمل").length} مكتمل`} />
                <KpiCard icon={Undo2} label="المرتجعات" value={returns.length} sub={`${fmt(tRet)} ر`} />
            </KpiGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Panel title="هدف اليوم" icon={Target}>
                    <div className="flex justify-between text-xs text-theme-faint mb-1">
                        <span>{fmt(tSales)} ر</span>
                        <span>{goalPct}%</span>
                    </div>
                    <Bar value={goalPct} color={goalPct >= 100 ? "var(--wusha-forest)" : goalPct >= 60 ? "#eda100" : "#e34948"} />
                    <div className="text-[11px] text-theme-faint mt-1.5">
                        هدف: {fmt(GOAL)} ر{tSales < GOAL ? ` — يتبقى ${fmt(GOAL - tSales)} ر` : " — تحقق الهدف"}
                    </div>

                    <div className="h-px bg-theme-subtle my-4" />

                    <div className="flex items-center gap-2 text-sm font-bold text-theme-soft mb-3">
                        <CreditCard className="w-4 h-4 text-gold" />توزيع الدفع
                    </div>
                    {tSales ? (
                        Object.entries(payMap).map(([k, v]) => (
                            <div key={k} className="mb-2">
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-theme">{k}</span>
                                    <span className="text-theme-soft">{fmt(v)} ر · {pct(v, tSales)}%</span>
                                </div>
                                <Bar value={pct(v, tSales)} color="#2a78d6" />
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-theme-faint">لا توجد بيانات</span>
                    )}
                </Panel>

                <Panel title="أعلى المنتجات" icon={Shirt}>
                    {top.length ? (
                        top.map(([n, v], i) => (
                            <div key={n} className="mb-2.5">
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-theme">{n}</span>
                                    <span className="font-bold text-theme">{fmt(v)} ر</span>
                                </div>
                                <Bar value={pct(v, topMax)} color={SERIES[i % SERIES.length]} />
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-theme-faint">لا توجد مبيعات بعد</span>
                    )}
                </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Panel title="آخر الطلبات" icon={Clock}>
                    {orders.length ? (
                        [...orders].reverse().slice(0, 4).map((o) => (
                            <div key={o.id} className="py-1.5 border-b border-theme-subtle last:border-0">
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-theme">{o.name}</span>
                                    <span className="font-bold text-blue-400">{fmt(o.amount)} ر</span>
                                </div>
                                <div className="text-[11px] text-theme-faint mt-0.5">{o.product} · {o.size} · {o.time}</div>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-theme-faint">لا توجد طلبات بعد</span>
                    )}
                </Panel>

                <Panel title="تنبيهات المخزون" icon={AlertTriangle}>
                    <div className="space-y-1.5">
                        {low.length ? (
                            low.map((p) => {
                                const tot = totalStock(p.id, stock);
                                return (
                                    <Alert key={p.id} tone={tot === 0 ? "r" : "a"}>
                                        {p.name} — {tot === 0 ? "نفاذ تام" : `يتبقى ${tot}`}
                                    </Alert>
                                );
                            })
                        ) : (
                            <Alert tone="g">المخزون بمستوى جيد</Alert>
                        )}
                    </div>
                </Panel>

                <Panel title="ملخص مالي" icon={Scale}>
                    <AccRow label="الإيرادات" value={`${fmt(tSales)} ر`} valueClass="text-blue-400" />
                    <AccRow label="الخصومات" value={`- ${fmt(tDisc)} ر`} valueClass="text-amber-400" />
                    <AccRow label="COGS" value={`- ${fmt(tCOGS)} ر`} valueClass="text-red-400" />
                    <AccRow label="مصاريف" value={`- ${fmt(tExp)} ر`} valueClass="text-red-400" />
                    <AccRow label="مرتجعات" value={`- ${fmt(tRet)} ر`} valueClass="text-red-400" />
                    <AccRow label="صافي الربح" value={`${fmt(netP)} ر`} valueClass={netP >= 0 ? "text-forest" : "text-red-400"} strong />
                    <div className="text-[11px] text-theme-faint mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />هامش: {tSales ? pct(netP, tSales) : 0}%
                    </div>
                </Panel>
            </div>
        </div>
    );
}
