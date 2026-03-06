import { AdminHeader } from "@/components/admin/AdminHeader";
import { getAnnouncements } from "@/app/actions/announcements";
import { AnnouncementsClient } from "./AnnouncementsClient";

export const metadata = {
    title: "إدارة الإعلانات | لوحة الإدارة",
};

export default async function AnnouncementsPage() {
    const announcements = await getAnnouncements();

    return (
        <div className="space-y-6">
            <AdminHeader
                title="إدارة الإعلانات والعروض"
                subtitle="إنشاء وجدولة وإدارة الإعلانات والعروض الترويجية للعملاء."
            />
            <AnnouncementsClient announcements={announcements} />
        </div>
    );
}
