import { getSalesRecords } from "@/app/actions/erp/sales";
import { getWarehouses, getSKUs } from "@/app/actions/erp/inventory";
import SalesClient from "@/components/admin/erp/SalesClient";

export const metadata = {
    title: "المبيعات ونقاط البيع - وشّى | WASHA",
};

export default async function SalesPage() {
    const [salesRes, whRes, skusRes] = await Promise.all([
        getSalesRecords(),
        getWarehouses(),
        getSKUs()
    ]);

    if (salesRes.error || whRes.error || skusRes.error) {
        return (
            <div className="p-8 text-center text-red-400">
                <p>خطأ في جلب بيانات المبيعات</p>
            </div>
        );
    }

    return (
        <main className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-theme">إدارة المبيعات ونقاط البيع (POS)</h1>
                <p className="text-theme-soft">
                    تسجيل المبيعات اليدوية (مثل البوثات) ومتابعة سجل المبيعات الشامل.
                </p>
            </header>

            <SalesClient
                initialSales={salesRes.records || []}
                warehouses={whRes.warehouses || []}
                skus={skusRes.skus || []}
            />
        </main>
    );
}
