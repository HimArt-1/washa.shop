import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrders } from "@/app/actions/orders";
import { getUserDesignOrders } from "@/app/actions/smart-store";
import { OrdersClient } from "./OrdersClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "طلباتي — وشّى",
    description: "تتبع حالة طلباتك على منصة وشّى",
};

export default async function OrdersPage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const [ordersRes, designOrders] = await Promise.all([
        getUserOrders(),
        getUserDesignOrders()
    ]);

    const orders = ordersRes.data || [];
    const totalCount = orders.length + designOrders.length;

    return (
        <div className="pt-8 pb-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="theme-surface-panel mb-8 rounded-[2rem] px-6 py-6 sm:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">ACCOUNT ORDERS</p>
                            <h1 className="mt-2 text-2xl font-bold text-theme sm:text-3xl">طلباتي</h1>
                            <p className="mt-2 text-sm text-theme-faint">{totalCount} طلب بين الشراء والتصميم المخصص</p>
                        </div>
                        <Link href="/account" className="inline-flex items-center gap-2 self-start rounded-2xl border border-theme-soft bg-theme-faint px-4 py-2.5 text-xs text-theme-faint transition-colors hover:border-gold/25 hover:text-gold sm:self-auto">
                            <ArrowLeft className="w-4 h-4" />
                            حسابي
                        </Link>
                    </div>
                </div>

                <Suspense fallback={<div className="py-12 text-center text-theme-subtle">جاري التحميل...</div>}>
                    <OrdersClient orders={orders} designOrders={designOrders} />
                </Suspense>
            </div>
        </div>
    );
}
