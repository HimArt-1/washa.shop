import { getSiteSettings } from "@/app/actions/settings";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
    const settings = await getSiteSettings();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إعدادات الموقع</h1>
                <p className="text-fg/40 mt-1">تحكم في إعدادات ومظهر الموقع بالكامل.</p>
            </div>

            <SettingsClient settings={settings} />
        </div>
    );
}
