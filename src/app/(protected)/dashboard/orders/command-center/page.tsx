import { getFulfillmentHubData } from "@/app/actions/admin";
import { FulfillmentCommandCenter } from "@/components/admin/orders/FulfillmentCommandCenter";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ShoppingCart } from "lucide-react";

export const metadata = {
    title: "مركز قيادة الطلبات | وشّى الإدارة",
    description: "تتبع وتنفيذ الطلبات المؤكدة والمدفوعة من جميع القنوات.",
};

export default async function FulfillmentHubPage() {
    const data = await getFulfillmentHubData();

    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز قيادة الطلبات"
                subtitle="منصة موحدة لتتبع الطلبات المدفوعة وإدارة التنفيذ اللحظي."
            />

            <FulfillmentCommandCenter data={data as any} />
        </div>
    );
}
