"use client";

// نظام إدارة البوث — الحاوية الرئيسية (تبويبات + مزوّد الحالة)
// المرحلة 1: حالة client في الذاكرة. المرحلة 2: ربط تدريجي بـ Supabase.

import { useState } from "react";
import {
    LayoutDashboard, Shirt, Box, ShoppingBag, Plus, Monitor, Tag, Undo2, Calculator, Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BoothProvider } from "./BoothContext";
import type { BoothTabId } from "./types";
import { DashboardTab } from "./tabs/DashboardTab";
import { ProductsTab } from "./tabs/ProductsTab";
import { StockTab } from "./tabs/StockTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { NewOrderTab } from "./tabs/NewOrderTab";
import { CashierTab } from "./tabs/CashierTab";
import { DiscountsTab } from "./tabs/DiscountsTab";
import { ReturnsTab } from "./tabs/ReturnsTab";
import { FinanceTab } from "./tabs/FinanceTab";
import { EodTab } from "./tabs/EodTab";

const TABS: { id: BoothTabId; label: string; icon: LucideIcon; render: () => React.ReactNode }[] = [
    { id: "dash", label: "لوحة التحكم", icon: LayoutDashboard, render: () => <DashboardTab /> },
    { id: "products", label: "المنتجات", icon: Shirt, render: () => <ProductsTab /> },
    { id: "stock", label: "المخزون", icon: Box, render: () => <StockTab /> },
    { id: "orders", label: "الطلبات", icon: ShoppingBag, render: () => <OrdersTab /> },
    { id: "new-order", label: "طلب جديد", icon: Plus, render: () => <NewOrderTab /> },
    { id: "cashier", label: "الكاشير", icon: Monitor, render: () => <CashierTab /> },
    { id: "discounts", label: "الخصومات", icon: Tag, render: () => <DiscountsTab /> },
    { id: "returns", label: "المرتجعات", icon: Undo2, render: () => <ReturnsTab /> },
    { id: "finance", label: "المالية", icon: Calculator, render: () => <FinanceTab /> },
    { id: "eod", label: "إغلاق اليوم", icon: Moon, render: () => <EodTab /> },
];

export default function BoothSystemClient() {
    const [active, setActive] = useState<BoothTabId>("dash");
    const current = TABS.find((t) => t.id === active) ?? TABS[0];

    return (
        <BoothProvider>
            <nav className="flex gap-1 flex-wrap border-b border-theme-subtle pb-2.5 mb-4 -mx-1 px-1 overflow-x-auto">
                {TABS.map((t) => {
                    const on = t.id === active;
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActive(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${on ? "bg-surface-2/70 text-theme font-bold" : "text-theme-soft hover:bg-surface-2/40"}`}
                        >
                            <Icon className={`w-4 h-4 ${on ? "text-gold" : ""}`} />
                            {t.label}
                        </button>
                    );
                })}
            </nav>

            <div key={active}>{current.render()}</div>
        </BoothProvider>
    );
}
