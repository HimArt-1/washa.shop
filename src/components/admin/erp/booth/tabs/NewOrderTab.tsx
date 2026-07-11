"use client";

import { useMemo, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { useBooth } from "../BoothContext";
import { SIZES, fmt, applyDiscount, PAY_METHODS } from "../shared";
import { Panel, Field, inputCls, selectCls, Toggle, BtnPrimary, BtnGhost } from "../ui";

const STATUSES = ["جديد", "قيد التنفيذ", "مكتمل"];

export function NewOrderTab() {
    const { products, stock, discounts, addOrder } = useBooth();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [pid, setPid] = useState("");
    const [size, setSize] = useState("");
    const [qty, setQty] = useState("1");
    const [amount, setAmount] = useState("");
    const [discId, setDiscId] = useState("");
    const [pay, setPay] = useState("");
    const [status, setStatus] = useState("جديد");
    const [note, setNote] = useState("");
    const [prepaid, setPrepaid] = useState(false);

    const product = products.find((p) => String(p.id) === pid);
    const qtyN = parseInt(qty) || 1;
    const available = pid && size ? (stock[Number(pid)] && stock[Number(pid)][size]) || 0 : null;

    // تحديث السعر المقترح عند تغيير المنتج/المقاس/الكمية
    const onProdChange = (nextPid: string, nextSize: string, nextQty: string) => {
        const p = products.find((x) => String(x.id) === nextPid);
        const q = parseInt(nextQty) || 1;
        if (p && nextSize) setAmount(String(p.price * q));
    };

    const discPreview = useMemo(() => {
        if (!discId) return null;
        const res = applyDiscount(parseFloat(amount) || 0, discId, discounts);
        return res.amt ? `خصم مطبّق: ${res.label} · الإجمالي: ${fmt(res.final)} ر` : res.label;
    }, [discId, amount, discounts]);

    const reset = () => {
        setName(""); setPhone(""); setPid(""); setSize(""); setQty("1");
        setAmount(""); setDiscId(""); setPay(""); setStatus("جديد"); setNote("");
        setPrepaid(false);
    };

    const onSubmit = () => {
        const ok = addOrder({
            name: name.trim(),
            pid: Number(pid),
            size,
            qty: qtyN,
            baseAmount: parseFloat(amount) || 0,
            pay,
            status,
            discId,
            prepaid,
            note: note.trim(),
        });
        if (ok) reset();
    };

    return (
        <Panel title="طلب جديد" icon={Plus}>
            <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="اسم العميل">
                        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" />
                    </Field>
                    <Field label="رقم التواصل">
                        <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="المنتج">
                        <select className={selectCls} value={pid} onChange={(e) => { setPid(e.target.value); onProdChange(e.target.value, size, qty); }}>
                            <option value="">-- اختر --</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} — {p.price} ر</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="المقاس">
                        <select className={selectCls} value={size} onChange={(e) => { setSize(e.target.value); onProdChange(pid, e.target.value, qty); }}>
                            <option value="">-- اختر --</option>
                            {SIZES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="الكمية">
                        <input className={inputCls} type="number" min={1} value={qty} onChange={(e) => { setQty(e.target.value); onProdChange(pid, size, e.target.value); }} />
                    </Field>
                </div>

                <div className="min-h-[18px] text-xs text-theme-faint">
                    {product && size && available !== null && (
                        <span>
                            <span className={available === 0 ? "text-red-400" : available < qtyN ? "text-amber-400" : "text-forest"}>
                                متاح ({size}): {available} قطعة{available < qtyN ? " — لا يكفي" : ""}
                            </span>
                            {" · "}سعر مقترح: {fmt(product.price * qtyN)} ر
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="السعر (ر)">
                        <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="كوبون / خصم">
                        <select className={selectCls} value={discId} onChange={(e) => setDiscId(e.target.value)}>
                            <option value="">لا يوجد خصم</option>
                            {discounts.map((d) => (
                                <option key={d.id} value={d.id}>{d.code} — {d.type === "pct" ? `${d.val}%` : `${d.val} ر`}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="طريقة الدفع">
                        <select className={selectCls} value={pay} onChange={(e) => setPay(e.target.value)}>
                            <option value="">-- اختر --</option>
                            {PAY_METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="حالة الطلب">
                        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="ملاحظات">
                        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي تفاصيل..." />
                    </Field>
                </div>

                {discPreview && <div className="text-xs text-forest min-h-[16px]">{discPreview}</div>}

                <div className="h-px bg-theme-subtle" />

                <div>
                    <div className="text-xs text-theme-soft mb-2">حالة الدفع</div>
                    <Toggle
                        on={prepaid}
                        onToggle={() => setPrepaid((v) => !v)}
                        title={prepaid ? "مدفوع مسبقاً" : "الدفع عند الاستلام"}
                        sub={prepaid ? "سيُضاف للمبيعات فوراً" : "سيُحصّل عند التسليم"}
                    />
                </div>

                <div className="flex gap-2 pt-1">
                    <BtnPrimary onClick={onSubmit}><Check className="w-4 h-4" />حفظ الطلب</BtnPrimary>
                    <BtnGhost onClick={reset}><X className="w-4 h-4" />مسح</BtnGhost>
                </div>
            </div>
        </Panel>
    );
}
