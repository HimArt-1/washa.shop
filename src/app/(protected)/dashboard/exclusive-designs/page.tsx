import { getExclusiveDesigns } from "@/app/actions/settings";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ExclusiveDesignsClient } from "@/components/admin/ExclusiveDesignsClient";

export default async function ExclusiveDesignsPage() {
    const designs = await getExclusiveDesigns();

    return (
        <div className="space-y-6">
            <AdminHeader
                title="تصاميم وشّى الحصرية"
                subtitle="إدارة المطبوعات الحصرية التي تظهر في مسار «صمّم قطعتك» — تصاميم وشّى الخاصة."
            />
            <ExclusiveDesignsClient initialDesigns={designs} />
        </div>
    );
}
