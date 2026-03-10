import { getSKUs } from "@/app/actions/erp/inventory";
import BarcodesClient from "@/components/admin/erp/BarcodesClient";

export const metadata = {
    title: "الباركود - وشّى | WASHA",
};

export default async function BarcodesPage() {
    const { skus, error } = await getSKUs();

    if (error) {
        return (
            <div className="p-8 text-center text-red-400">
                <p>خطأ في جلب بيانات الباركود: {error}</p>
            </div>
        );
    }

    return (
        <main className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-theme">إدارة الباركود والمنتجات</h1>
                <p className="text-theme-soft">
                    أضف رموز الباركود (SKU) الخاصة بالمنتجات والمقاسات والألوان لضبط عمليات المستودعات والمبيعات
                </p>
            </header>

            <BarcodesClient initialSKUs={skus || []} />
        </main>
    );
}
