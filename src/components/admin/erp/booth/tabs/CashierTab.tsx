"use client";

import { useMemo, useState } from "react";
import { Shirt, Receipt, Check, X, Minus, Plus, AlertTriangle } from "lucide-react";
import { useBooth } from "../BoothContext";
import { SIZES, fmt, pct, applyDiscount, PAY_METHODS } from "../shared";
import { Panel, Field, selectCls, inputCls, BtnPrimary, BtnGhost, Alert } from "../ui";

export function CashierTab() {
    const { products, stock, discounts, cart, setCart, completeSale } = useBooth();
    const [size, setSize] = useState("XS");
    const [pay, setPay] = useState<string>("نقد");
    const [discId, setDiscId] = useState("");
    const [name, setName] = useState("");

    const keys = Object.keys(cart).map(Number);

    const toggle = (id: number) => {
        setCart((prev) => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else next[id] = 1;
            return next;
        });
    };

    const changeQty = (id: number, d: number) => {
        setCart((prev) => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + d) }));
    };

    const { sub, totalCost, warns } = useMemo(() => {
        let sub = 0;
        let totalCost = 0;
        const warns: string[] = [];
        keys.forEach((id) => {
            const p = products.find((x) => x.id === id);
            if (!p) return;
            sub += p.price * cart[id];
            totalCost += p.cost * cart[id];
            const av = (stock[id] && stock[id][size]) || 0;
            if (av < cart[id]) warns.push(`${p.name}: متاح ${av} فقط (${size})`);
        });
        return { sub, totalCost, warns };
    }, [keys, cart, products, stock, size]);

    const dr = applyDiscount(sub, discId, discounts);
    const final = dr.final;
    const profit = final - totalCost;

    const onComplete = () => {
        const ok = completeSale({ name: name.trim(), size, pay, discId });
        if (ok) setName("");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Panel title="المنتجات" icon={Shirt}>
                <div className="space-y-2">
                    {products.map((p) => {
                        const sel = !!cart[p.id];
                        return (
                            <div
                                key={p.id}
                                onClick={() => toggle(p.id)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${sel ? "border-forest/40 bg-forest/10" : "border-theme-subtle hover:border-theme-soft"}`}
                            >
                                <div>
                                    <div className="text-[13px] font-bold text-theme">{p.name}</div>
                                    <div className="text-[11px] text-theme-faint">{p.price} ر · ربح {p.price - p.cost} ر</div>
                                </div>
                                {sel && (
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => changeQty(p.id, -1)} className="w-6 h-6 rounded-lg border border-theme-subtle text-theme flex items-center justify-center hover:bg-surface-2/60">
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-[13px] font-bold min-w-[14px] text-center text-theme">{cart[p.id]}</span>
                                        <button onClick={() => changeQty(p.id, 1)} className="w-6 h-6 rounded-lg border border-theme-subtle text-theme flex items-center justify-center hover:bg-surface-2/60">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="h-px bg-theme-subtle my-4" />

                <div className="grid grid-cols-2 gap-3">
                    <Field label="المقاس">
                        <select className={selectCls} value={size} onChange={(e) => setSize(e.target.value)}>
                            {SIZES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="طريقة الدفع">
                        <select className={selectCls} value={pay} onChange={(e) => setPay(e.target.value)}>
                            {PAY_METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="كوبون / خصم">
                        <select className={selectCls} value={discId} onChange={(e) => setDiscId(e.target.value)}>
                            <option value="">لا يوجد</option>
                            {discounts.map((d) => (
                                <option key={d.id} value={d.id}>{d.code} — {d.type === "pct" ? `${d.val}%` : `${d.val} ر`}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="اسم العميل (اختياري)">
                        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="بيع مباشر" />
                    </Field>
                </div>
            </Panel>

            <Panel title="الفاتورة" icon={Receipt}>
                <div className="min-h-[60px]">
                    {keys.length ? (
                        keys.map((id) => {
                            const p = products.find((x) => x.id === id);
                            if (!p) return null;
                            return (
                                <div key={id} className="flex justify-between py-1.5 border-b border-theme-subtle text-xs">
                                    <span className="text-theme">{p.name} × {cart[id]}</span>
                                    <span className="font-bold text-theme">{fmt(p.price * cart[id])} ر</span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-theme-faint text-xs py-2">اختر منتجاً</div>
                    )}
                </div>

                {warns.length > 0 && (
                    <div className="space-y-1 my-2">
                        {warns.map((w) => (
                            <Alert key={w} tone="a">{w}</Alert>
                        ))}
                    </div>
                )}

                <div className="h-px bg-theme-subtle my-3" />

                <div className="flex justify-between text-xs text-theme-faint mb-1">
                    <span>المجموع قبل الخصم</span>
                    <span>{fmt(sub)} ر</span>
                </div>
                {dr.amt > 0 && (
                    <div className="flex justify-between text-xs text-forest mb-1.5">
                        <span>{dr.label.split(":")[0]}</span>
                        <span>- {fmt(dr.amt)} ر</span>
                    </div>
                )}
                <div className="flex justify-between items-center rounded-xl bg-surface-2/50 px-4 py-3 mb-2">
                    <span className="text-xs text-theme-faint">الإجمالي النهائي</span>
                    <span className="text-lg font-bold text-blue-400 tabular-nums">{fmt(final)} ر</span>
                </div>
                {keys.length > 0 && (
                    <div className="text-[11px] text-theme-faint mb-3">
                        ربح متوقع: <span className={`font-bold ${profit >= 0 ? "text-forest" : "text-red-400"}`}>{fmt(profit)} ر</span> · هامش {final ? pct(profit, final) : 0}%
                    </div>
                )}

                <BtnPrimary onClick={onComplete} className="w-full"><Check className="w-4 h-4" />إتمام البيع</BtnPrimary>
                <BtnGhost onClick={() => setCart({})} className="w-full mt-2"><X className="w-4 h-4" />مسح الكاشير</BtnGhost>
            </Panel>
        </div>
    );
}
