"use client";

import { useMemo, useState } from "react";
import { Moon, Check, FileText, Download } from "lucide-react";
import { useBooth } from "../BoothContext";
import { fmt, pct, R } from "../shared";
import { Panel, Field, inputCls, AccRow, BtnPrimary, BtnGhost } from "../ui";

export function EodTab() {
    const b = useBooth();
    const { tSales, tCOGS, tExp, tRet, tDisc, netP, sales, orders, returns } = b;
    const [cashStr, setCashStr] = useState("");
    const [note, setNote] = useState("");
    const [report, setReport] = useState<string | null>(null);

    const cashActual = parseFloat(cashStr) || 0;
    const cashSales = useMemo(() => sales.filter((s) => s.pay === "نقد").reduce((t, s) => t + s.amount, 0), [sales]);
    const diff = cashActual - cashSales;

    const buildReport = () => {
        const now = new Date();
        const line = "──────────────────────────────";
        const txt = `تقرير إغلاق اليوم — وشّى تيشيرتات
${now.toLocaleDateString("ar-SA")} ${now.toLocaleTimeString("ar-SA")}
${line}
إجمالي المبيعات:       ${fmt(tSales)} ر
إجمالي الخصومات:       ${fmt(tDisc)} ر
تكلفة البضاعة (COGS):  ${fmt(tCOGS)} ر
المصاريف التشغيلية:    ${fmt(tExp)} ر
المرتجعات:             ${fmt(tRet)} ر
${line}
مجمل الربح:            ${fmt(tSales - tCOGS)} ر
صافي الربح:            ${fmt(netP)} ر
هامش الربح:            ${tSales ? pct(netP, tSales) : 0}%
${line}
مبيعات النقد (نظام):   ${fmt(cashSales)} ر
نقد فعلي في الدرج:     ${fmt(cashActual)} ر
الفرق:                 ${diff >= 0 ? "+" : ""}${fmt(diff)} ر
${line}
عدد الطلبات:           ${orders.length}
المبيعات المكتملة:      ${orders.filter((o) => o.status === "مكتمل").length}
المرتجعات:             ${returns.length}
عمليات الكاشير:        ${sales.filter((s) => s.source === "كاشير").length}
${note ? line + "\nملاحظات: " + note : ""}`;
        setReport(txt);
    };

    const exportTxt = () => {
        const txt = report ?? "";
        download(new Blob([txt], { type: "text/plain;charset=utf-8" }), "washa-report.txt");
    };

    const exportCSV = () => {
        const now = new Date();
        let csv = "﻿";
        csv += `وشّى تيشيرتات — تقرير يومي\nالتاريخ,${now.toLocaleDateString("ar-SA")}\n\n`;
        csv += `الملخص المالي\nإجمالي المبيعات,${R(tSales)}\nالخصومات,${R(tDisc)}\nتكلفة البضاعة,${R(tCOGS)}\nالمصاريف,${R(tExp)}\nالمرتجعات,${R(tRet)}\nصافي الربح,${R(netP)}\n\n`;
        csv += `الطلبات\nرقم,العميل,المنتج,المقاس,الكمية,المبلغ,الخصم,COGS,الربح,الدفع,الحالة\n`;
        orders.forEach((o) => {
            csv += `${o.id},"${o.name}","${o.product}",${o.size},${o.qty},${R(o.amount)},${R(o.discAmt || 0)},${R(o.cogs)},${R(o.profit)},${o.pay},${o.status}\n`;
        });
        download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `washa-${now.toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="space-y-3">
            <Panel title="تسوية نهاية اليوم" icon={Moon}>
                <div className="space-y-3">
                    <Field label="الكاش الفعلي في الدرج (ر)">
                        <input className={inputCls} type="number" value={cashStr} onChange={(e) => setCashStr(e.target.value)} placeholder="0" />
                    </Field>
                    <div>
                        <AccRow label="إجمالي المبيعات" value={`${fmt(tSales)} ر`} valueClass="text-blue-400" />
                        <AccRow label="مبيعات النقد (النظام)" value={`${fmt(cashSales)} ر`} />
                        <AccRow label="الكاش الفعلي في الدرج" value={`${fmt(cashActual)} ر`} />
                        <AccRow
                            label="فرق الكاش"
                            value={`${diff >= 0 ? "+" : ""}${fmt(diff)} ر ${diff === 0 ? "— مطابق" : diff > 0 ? "— فائض" : "— عجز"}`}
                            valueClass={diff < 0 ? "text-red-400" : "text-forest"}
                        />
                        <AccRow label="خصومات" value={`- ${fmt(tDisc)} ر`} valueClass="text-amber-400" />
                        <AccRow label="تكلفة البضاعة" value={`- ${fmt(tCOGS)} ر`} valueClass="text-red-400" />
                        <AccRow label="المصاريف" value={`- ${fmt(tExp)} ر`} valueClass="text-red-400" />
                        <AccRow label="المرتجعات" value={`- ${fmt(tRet)} ر`} valueClass="text-red-400" />
                        <AccRow label="صافي الربح" value={`${fmt(netP)} ر`} valueClass={netP >= 0 ? "text-forest" : "text-red-400"} strong />
                    </div>
                    <div className="h-px bg-theme-subtle" />
                    <Field label="ملاحظات الإغلاق">
                        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظات عن اليوم..." />
                    </Field>
                    <BtnPrimary onClick={buildReport}><Check className="w-4 h-4" />إغلاق اليوم</BtnPrimary>
                </div>
            </Panel>

            {report && (
                <Panel title="التقرير النهائي" icon={FileText}>
                    <pre className="font-mono text-xs leading-7 whitespace-pre text-theme-soft overflow-x-auto">{report}</pre>
                    <div className="mt-3 flex gap-2">
                        <BtnGhost onClick={exportCSV}><Download className="w-4 h-4" />تصدير CSV</BtnGhost>
                        <BtnGhost onClick={exportTxt}><FileText className="w-4 h-4" />تصدير نصي</BtnGhost>
                    </div>
                </Panel>
            )}
        </div>
    );
}

function download(blob: Blob, filename: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}
