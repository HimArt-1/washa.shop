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
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-theme">طلباتي</h1>
                        <p className="text-theme-faint text-sm mt-1">{totalCount} طلب</p>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 text-xs text-theme-faint hover:text-gold transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        حسابي
                    </Link>
                </div>

                <OrdersClient orders={orders} designOrders={designOrders} />
            </div>
        </div>
    );
}
