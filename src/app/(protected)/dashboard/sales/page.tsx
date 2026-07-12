import { getSalesRecords } from "@/app/actions/erp/sales";
import { getSKUsForSales, getWarehousesForSales } from "@/app/actions/erp/inventory";
import BoothPageShell from "@/components/admin/erp/booth/BoothPageShell";

export const metadata = {
    title: "نظام البوث ونقاط البيع - وشّى | WASHA",
};

export default async function SalesPage() {
    const [salesRes, whRes, skusRes] = await Promise.all([
        getSalesRecords(),
        getWarehousesForSales(),
        getSKUsForSales()
    ]);

    if (salesRes.error || whRes.error || skusRes.error) {
        const message = salesRes.error || whRes.error || skusRes.error || "تعذر جلب بيانات المبيعات";
        return (
            <div className="p-8 text-center text-red-400">
                <p>خطأ في جلب بيانات المبيعات</p>
                <p className="mt-2 text-sm text-red-300/80">{message}</p>
            </div>
        );
    }

    return (
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <BoothPageShell
                initialSales={salesRes.records || []}
                warehouses={whRes.warehouses || []}
                skus={skusRes.skus || []}
            />
        </main>
    );
}
