"use client";

import { useMemo, useState } from "react";
import {
    ResponsiveContainer, BarChart, Bar as RBar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Coins, Shirt, TrendingUp, Calculator, Scale, BarChart3, LineChart as LineChartIcon, AreaChart, Plus, List, PieChart, Percent, Receipt, Undo2 } from "lucide-react";
import { useBooth } from "../BoothContext";
import { fmt, pct, R, DAYS, MONTHS, SERIES, EXP_C, EXP_CATS, type ExpensePeriod } from "../shared";
import { Panel, Field, inputCls, selectCls, KpiCard, KpiGrid, AccRow, Bar, BtnDanger } from "../ui";

type Seg = "day" | "week" | "month" | "exp";

const chartTooltip = {
    contentStyle: { backgroundColor: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 },
    labelStyle: { color: "#ceae7f" },
};

function PnL() {
    const { tSales, tCOGS, tDisc, tExp, tRet, netP } = useBooth();
    const gp = tSales - tCOGS;
    const mn = tSales ? pct(netP, tSales) : 0;
    return (
        <div>
            <AccRow label="إجمالي المبيعات" value={`${fmt(tSales)} ر`} valueClass="text-blue-400" />
            {tDisc > 0 && <AccRow label="الخصومات" value={`- ${fmt(tDisc)} ر`} valueClass="text-amber-400" />}
            <AccRow label="تكلفة البضاعة (COGS)" value={`- ${fmt(tCOGS)} ر`} valueClass="text-red-400" />
            <AccRow label="مجمل الربح" value={`${fmt(gp)} ر`} valueClass={gp >= 0 ? "text-forest" : "text-red-400"} />
            <AccRow label="المصاريف" value={`- ${fmt(tExp)} ر`} valueClass="text-red-400" />
            {tRet > 0 && <AccRow label="المرتجعات" value={`- ${fmt(tRet)} ر`} valueClass="text-red-400" />}
            <AccRow label="صافي الربح" value={`${fmt(netP)} ر`} valueClass={netP >= 0 ? "text-forest" : "text-red-400"} strong />
            <div className="mt-2">
                <div className="text-[11px] text-theme-faint mb-0.5">هامش الربح: {mn}%</div>
                <Bar value={mn} color={netP >= 0 ? "var(--wusha-forest)" : "#e34948"} />
            </div>
        </div>
    );
}

export function FinanceTab() {
    const b = useBooth();
    const { tSales, tCOGS, tExp, tRet, netP, sales, products, expenses, addExpense } = b;
    const [seg, setSeg] = useState<Seg>("day");

    // مبيعات حسب المنتج (رسم يومي)
    const byProduct = useMemo(() => {
        const pm: Record<string, number> = {};
        sales.forEach((s) => products.forEach((p) => { if (s.detail.includes(p.name)) pm[p.name] = (pm[p.name] || 0) + s.amount; }));
        return Object.entries(pm).map(([name, value]) => ({ name, value }));
    }, [sales, products]);

    // اتجاه الأسبوع (تقديري مبني على إجمالي اليوم)
    const weekData = useMemo(() => DAYS.map((d, i) => {
        const s = i === 6 ? tSales : R(tSales * (0.4 + ((i * 13) % 7) / 10));
        const e = i === 6 ? tExp : R(tExp * (0.3 + ((i * 7) % 10) / 10));
        return { d, sales: s, profit: s - R(tCOGS / 7) - e, exp: e };
    }), [tSales, tExp, tCOGS]);

    // اتجاه الشهر
    const monthData = useMemo(() => {
        const now = new Date();
        return MONTHS.slice(0, now.getMonth() + 1).map((m, i, arr) => {
            const s = i === arr.length - 1 ? tSales : R(tSales * (0.3 + ((i * 11) % 9) / 10));
            const profit = i === arr.length - 1 ? netP : R(s * (0.15 + ((i * 5) % 4) / 10));
            return { m, revenue: s, profit };
        });
    }, [tSales, netP]);

    // فئات المصاريف
    const expByCat = useMemo(() => {
        const cm: Record<string, number> = {};
        expenses.forEach((e) => (cm[e.cat] = (cm[e.cat] || 0) + e.amount));
        return Object.entries(cm);
    }, [expenses]);

    const [eName, setEName] = useState("");
    const [eAmt, setEAmt] = useState("");
    const [eCat, setECat] = useState(EXP_CATS[0]);
    const [ePeriod, setEPeriod] = useState<ExpensePeriod>("اليوم");

    const onAddExp = () => {
        addExpense({ name: eName.trim(), amount: parseFloat(eAmt) || 0, cat: eCat, period: ePeriod });
        setEName(""); setEAmt("");
    };

    const segs: { id: Seg; label: string }[] = [
        { id: "day", label: "اليوم" }, { id: "week", label: "الأسبوع" }, { id: "month", label: "الشهر" }, { id: "exp", label: "المصاريف" },
    ];

    return (
        <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
                {segs.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setSeg(s.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs border transition-colors ${seg === s.id ? "bg-gold text-black border-gold font-bold" : "bg-surface-2/40 text-theme-soft border-theme-subtle hover:bg-surface-2/70"}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {seg === "day" && (
                <>
                    <KpiGrid>
                        <KpiCard icon={Coins} label="الإيرادات" value={`${fmt(tSales)} ر`} />
                        <KpiCard icon={Shirt} label="COGS" value={`${fmt(tCOGS)} ر`} />
                        <KpiCard icon={TrendingUp} label="مجمل الربح" value={`${fmt(tSales - tCOGS)} ر`} sub={tSales ? `${pct(tSales - tCOGS, tSales)}% هامش` : ""} />
                        <KpiCard icon={Calculator} label="صافي الربح" value={`${fmt(netP)} ر`} tone={netP >= 0 ? "up" : "down"} />
                    </KpiGrid>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <Panel title="أرباح وخسائر — اليوم" icon={Scale}><PnL /></Panel>
                        <Panel title="مبيعات حسب المنتج" icon={BarChart3}>
                            <div className="h-[190px]">
                                {byProduct.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={byProduct}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                                            <XAxis dataKey="name" stroke="rgba(150,150,150,0.6)" fontSize={10} />
                                            <YAxis stroke="rgba(150,150,150,0.6)" fontSize={10} />
                                            <Tooltip {...chartTooltip} formatter={(v) => [`${fmt(Number(v))} ر`, "مبيعات"]} />
                                            <RBar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {byProduct.map((_, i) => (
                                                    <Cell key={i} fill={SERIES[i % SERIES.length]} />
                                                ))}
                                            </RBar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-theme-faint">لا توجد مبيعات بعد</div>
                                )}
                            </div>
                        </Panel>
                    </div>
                </>
            )}

            {seg === "week" && (
                <>
                    <KpiGrid>
                        <KpiCard icon={Coins} label="مبيعات الأسبوع" value={`${fmt(tSales)} ر`} />
                        <KpiCard icon={Receipt} label="مصاريف الأسبوع" value={`${fmt(tExp)} ر`} />
                        <KpiCard icon={TrendingUp} label="صافي الأسبوع" value={`${fmt(netP)} ر`} tone={netP >= 0 ? "up" : "down"} />
                        <KpiCard icon={BarChart3} label="عمليات البيع" value={sales.length} />
                    </KpiGrid>
                    <Panel title="مبيعات وأرباح الأسبوع" icon={LineChartIcon}>
                        <div className="flex gap-3 mb-2 text-[11px] text-theme-faint">
                            <Legend color="#2a78d6" label="مبيعات" />
                            <Legend color="#2a7a5a" label="ربح صافي" />
                            <Legend color="#e34948" label="مصاريف" />
                        </div>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weekData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                                    <XAxis dataKey="d" stroke="rgba(150,150,150,0.6)" fontSize={10} />
                                    <YAxis stroke="rgba(150,150,150,0.6)" fontSize={10} />
                                    <Tooltip {...chartTooltip} />
                                    <Line type="monotone" dataKey="sales" name="مبيعات" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="profit" name="ربح" stroke="#2a7a5a" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="exp" name="مصاريف" stroke="#e34948" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>
                    <Panel title="ملخص الأسبوع" icon={Scale}><PnL /></Panel>
                </>
            )}

            {seg === "month" && (
                <>
                    <KpiGrid>
                        <KpiCard icon={Coins} label="مبيعات الشهر" value={`${fmt(tSales)} ر`} />
                        <KpiCard icon={TrendingUp} label="صافي الشهر" value={`${fmt(netP)} ر`} tone={netP >= 0 ? "up" : "down"} />
                        <KpiCard icon={Percent} label="هامش الشهر" value={`${tSales ? pct(netP, tSales) : 0}%`} />
                        <KpiCard icon={Undo2} label="المرتجعات" value={`${fmt(tRet)} ر`} />
                    </KpiGrid>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <Panel title="اتجاه الشهر" icon={AreaChart}>
                            <div className="flex gap-3 mb-2 text-[11px] text-theme-faint">
                                <Legend color="#2a78d6" label="إيرادات" />
                                <Legend color="#2a7a5a" label="أرباح" />
                            </div>
                            <div className="h-[190px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                                        <XAxis dataKey="m" stroke="rgba(150,150,150,0.6)" fontSize={9} />
                                        <YAxis stroke="rgba(150,150,150,0.6)" fontSize={10} />
                                        <Tooltip {...chartTooltip} />
                                        <Line type="monotone" dataKey="revenue" name="إيرادات" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="profit" name="أرباح" stroke="#2a7a5a" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>
                        <Panel title="ملخص الشهر" icon={Scale}><PnL /></Panel>
                    </div>
                </>
            )}

            {seg === "exp" && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <Panel title="إضافة مصروف" icon={Plus}>
                            <div className="space-y-3">
                                <Field label="البند">
                                    <input className={inputCls} value={eName} onChange={(e) => setEName(e.target.value)} placeholder="إيجار، تغليف، مواصلات..." />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="المبلغ (ر)">
                                        <input className={inputCls} type="number" value={eAmt} onChange={(e) => setEAmt(e.target.value)} placeholder="0" />
                                    </Field>
                                    <Field label="التصنيف">
                                        <select className={selectCls} value={eCat} onChange={(e) => setECat(e.target.value)}>
                                            {EXP_CATS.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                                <Field label="الفترة">
                                    <select className={selectCls} value={ePeriod} onChange={(e) => setEPeriod(e.target.value as ExpensePeriod)}>
                                        <option value="اليوم">اليوم</option>
                                        <option value="الأسبوع">الأسبوع</option>
                                        <option value="الشهر">الشهر</option>
                                    </select>
                                </Field>
                                <BtnDanger onClick={onAddExp}><Plus className="w-4 h-4" />إضافة</BtnDanger>
                            </div>
                        </Panel>

                        <Panel title="سجل المصاريف" icon={List}>
                            {expenses.length ? (
                                <div className="max-h-[260px] overflow-y-auto">
                                    {[...expenses].reverse().map((e) => (
                                        <div key={e.id} className="py-1.5 border-b border-theme-subtle last:border-0">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-bold text-theme">{e.name}</span>
                                                <span className="font-bold text-red-400">− {fmt(e.amount)} ر</span>
                                            </div>
                                            <div className="text-[11px] text-theme-faint mt-0.5">{e.cat} · {e.period} · {e.time}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-theme-faint text-xs">لا توجد مصاريف</div>
                            )}
                        </Panel>
                    </div>

                    <Panel title="توزيع المصاريف" icon={PieChart}>
                        {expByCat.length ? (
                            expByCat.map(([k, v]) => (
                                <div key={k} className="mb-2.5">
                                    <div className="flex justify-between text-xs mb-0.5">
                                        <span className="text-theme">{k}</span>
                                        <span className="text-theme-soft">{fmt(v)} ر · {tExp ? pct(v, tExp) : 0}%</span>
                                    </div>
                                    <Bar value={tExp ? pct(v, tExp) : 0} color={EXP_C[k] || "#888780"} />
                                </div>
                            ))
                        ) : (
                            <span className="text-xs text-theme-faint">لا توجد مصاريف</span>
                        )}
                    </Panel>
                </>
            )}
        </div>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            {label}
        </span>
    );
}
