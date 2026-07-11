"use client";

import { ShoppingBag, Check, Coins, TrendingUp, Tag } from "lucide-react";
import { useBooth } from "../BoothContext";
import { fmt } from "../shared";
import { KpiCard, KpiGrid, Pill, TableWrap } from "../ui";

function StatusPill({ status }: { status: string }) {
    if (status === "مكتمل") return <Pill tone="forest">مكتمل</Pill>;
    if (status === "قيد التنفيذ") return <Pill tone="blue">قيد التنفيذ</Pill>;
    if (status === "مرتجع") return <Pill tone="red">مرتجع</Pill>;
    return <Pill tone="gray">جديد</Pill>;
}

function PayStatusPill({ prepaid, paid }: { prepaid: boolean; paid: boolean }) {
    if (prepaid) return <Pill tone="violet">مسبقاً</Pill>;
    if (paid) return <Pill tone="forest">مدفوع</Pill>;
    return <Pill tone="amber">عند الاستلام</Pill>;
}

export function OrdersTab() {
    const { orders, tSales, grossP, tDisc } = useBooth();

    return (
        <div className="space-y-3">
            <KpiGrid>
                <KpiCard icon={ShoppingBag} label="الطلبات" value={orders.length} sub="إجمالي" />
                <KpiCard icon={Check} label="مكتملة" value={orders.filter((o) => o.status === "مكتمل").length} />
                <KpiCard icon={Coins} label="المبيعات" value={`${fmt(tSales)} ر`} />
                <KpiCard icon={TrendingUp} label="مجمل الربح" value={`${fmt(grossP)} ر`} sub="بعد COGS" />
                <KpiCard icon={Tag} label="خصومات" value={`${fmt(tDisc)} ر`} />
            </KpiGrid>

            <TableWrap>
                <table className="w-full text-xs min-w-[880px]">
                    <thead>
                        <tr className="bg-surface-2/50 text-theme-faint">
                            {["رقم", "العميل", "المنتج", "مقاس", "كمية", "المبلغ", "خصم", "COGS", "ربح", "الدفع", "حالة الدفع", "الطلب"].map((h) => (
                                <th key={h} className="px-3 py-2.5 text-right font-medium whitespace-nowrap border-b border-theme-subtle">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length ? (
                            [...orders].reverse().map((o) => (
                                <tr key={o.id} className="border-b border-theme-subtle last:border-0 hover:bg-surface-2/30">
                                    <td className="px-3 py-2.5 font-bold text-blue-400 text-[11px] whitespace-nowrap">#{String(o.id).padStart(3, "0")}</td>
                                    <td className="px-3 py-2.5 text-theme whitespace-nowrap">{o.name}</td>
                                    <td className="px-3 py-2.5 text-[11px] text-theme-soft">{o.product}</td>
                                    <td className="px-3 py-2.5 text-[11px] text-theme-faint">{o.size}</td>
                                    <td className="px-3 py-2.5 text-center text-theme-soft">{o.qty}</td>
                                    <td className="px-3 py-2.5 font-bold text-theme whitespace-nowrap">{fmt(o.amount)} ر</td>
                                    <td className="px-3 py-2.5 text-amber-400 text-[11px] whitespace-nowrap">{o.discAmt ? `- ${fmt(o.discAmt)} ر` : "—"}</td>
                                    <td className="px-3 py-2.5 text-red-400 text-[11px] whitespace-nowrap">{fmt(o.cogs)} ر</td>
                                    <td className="px-3 py-2.5 whitespace-nowrap"><span className={`font-bold ${o.profit >= 0 ? "text-forest" : "text-red-400"}`}>{fmt(o.profit)} ر</span></td>
                                    <td className="px-3 py-2.5"><Pill tone="blue">{o.pay}</Pill></td>
                                    <td className="px-3 py-2.5"><PayStatusPill prepaid={o.prepaid} paid={o.paid} /></td>
                                    <td className="px-3 py-2.5"><StatusPill status={o.status} /></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={12} className="text-center text-theme-faint py-10">لا توجد طلبات بعد</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableWrap>
        </div>
    );
}
