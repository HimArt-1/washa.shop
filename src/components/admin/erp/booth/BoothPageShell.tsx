"use client";

// غلاف صفحة المبيعات: يقدّم نظام البوث الجديد كواجهة رئيسية،
// ويُبقي نقطة البيع الحالية (المرتبطة بـ Supabase) متاحة بنقرة واحدة
// حتى لا تنقطع العمليات المباشرة خلال المرحلة 1.

import { useState } from "react";
import { LayoutGrid, Store } from "lucide-react";
import BoothSystemClient from "./BoothSystemClient";
import SalesClient from "../SalesClient";

type Mode = "booth" | "live";

export default function BoothPageShell({
    initialSales,
    warehouses,
    skus,
}: {
    initialSales: any[];
    warehouses: any[];
    skus: any[];
}) {
    const [mode, setMode] = useState<Mode>("booth");

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-theme">نظام إدارة البوث · نقطة البيع</h1>
                    <p className="text-sm text-theme-soft mt-0.5">
                        {mode === "booth"
                            ? "لوحة متكاملة: المنتجات، المخزون، الكاشير، الخصومات، المرتجعات، المالية، وإغلاق اليوم."
                            : "نقطة البيع المباشرة المرتبطة بالمخزون الفعلي على قاعدة البيانات."}
                    </p>
                </div>
                <div className="flex gap-1 rounded-xl border border-theme-subtle bg-surface-2/40 p-1 self-start">
                    <button
                        onClick={() => setMode("booth")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${mode === "booth" ? "bg-gold text-black font-bold" : "text-theme-soft hover:bg-surface-2/70"}`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />نظام البوث
                    </button>
                    <button
                        onClick={() => setMode("live")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${mode === "live" ? "bg-gold text-black font-bold" : "text-theme-soft hover:bg-surface-2/70"}`}
                    >
                        <Store className="w-3.5 h-3.5" />نقطة البيع المباشرة
                    </button>
                </div>
            </div>

            {mode === "booth" ? (
                <BoothSystemClient />
            ) : (
                <SalesClient initialSales={initialSales} warehouses={warehouses} skus={skus} />
            )}
        </div>
    );
}
