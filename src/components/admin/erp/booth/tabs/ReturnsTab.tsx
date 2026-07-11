"use client";

import { useState } from "react";
import { Undo2, List, Coins, Box } from "lucide-react";
import { useBooth } from "../BoothContext";
import { fmt, RETURN_REASONS, REFUND_METHODS } from "../shared";
import { Panel, Field, inputCls, selectCls, KpiCard, KpiGrid, BtnDanger } from "../ui";

export function ReturnsTab() {
    const { orders, returns, tRet, addReturn } = useBooth();
    const [orderId, setOrderId] = useState("");
    const [reason, setReason] = useState(RETURN_REASONS[0]);
    const [refund, setRefund] = useState(REFUND_METHODS[0]);
    const [note, setNote] = useState("");

    const eligible = orders.filter((o) => o.paid && o.status !== "مرتجع");

    const onSubmit = () => {
        addReturn({ orderId: Number(orderId), reason, refund, note: note.trim() });
        setOrderId("");
        setNote("");
    };

    return (
        <div className="space-y-3">
            <KpiGrid>
                <KpiCard icon={Undo2} label="المرتجعات" value={returns.length} sub="إجمالي" />
                <KpiCard icon={Coins} label="مبالغ مستردة" value={`${fmt(tRet)} ر`} />
                <KpiCard icon={Box} label="أُعيد للمخزون" value={returns.filter((r) => r.restocked).length} />
            </KpiGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Panel title="تسجيل مرتجع" icon={Undo2}>
                    <div className="space-y-3">
                        <Field label="الطلب">
                            <select className={selectCls} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {eligible.map((o) => (
                                    <option key={o.id} value={o.id}>#{String(o.id).padStart(3, "0")} — {o.name} — {fmt(o.amount)} ر</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="سبب الإرجاع">
                            <select className={selectCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                                {RETURN_REASONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="طريقة الاسترداد">
                            <select className={selectCls} value={refund} onChange={(e) => setRefund(e.target.value)}>
                                {REFUND_METHODS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="ملاحظة">
                            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="تفاصيل..." />
                        </Field>
                        <BtnDanger onClick={onSubmit}><Undo2 className="w-4 h-4" />تسجيل المرتجع</BtnDanger>
                    </div>
                </Panel>

                <Panel title="سجل المرتجعات" icon={List}>
                    {returns.length ? (
                        <div>
                            {[...returns].reverse().map((r) => (
                                <div key={r.id} className="py-2 border-b border-theme-subtle last:border-0">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-bold text-theme">#{String(r.orderId).padStart(3, "0")} — {r.customer}</span>
                                        <span className="font-bold text-red-400">- {fmt(r.amount)} ر</span>
                                    </div>
                                    <div className="text-[11px] text-theme-faint mt-0.5">
                                        {r.reason} · {r.refund}{r.restocked ? " · أُعيد للمخزون" : ""} · {r.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-theme-faint text-xs">لا توجد مرتجعات</div>
                    )}
                </Panel>
            </div>
        </div>
    );
}
