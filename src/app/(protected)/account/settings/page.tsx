import { getProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { SettingsThemeSection } from "@/components/account/SettingsThemeSection";
import { type ProfileFormData } from "@/lib/validations";
import { type UserRole } from "@/types/database";

export default async function SettingsPage() {
    const profile = await getProfile();

    if (!profile) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                    <p className="font-medium">الملف الشخصي غير متوفر</p>
                    <p className="text-sm mt-2 text-ink/70">
                        لم يتم إنشاء ملفك الشخصي بعد. تواصل مع إدارة المنصة لتفعيل حسابك.
                    </p>
                </div>
            </div>
        );
    }

    // Map DB profile to form data structure
    const initialData: Partial<ProfileFormData> = {
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
        avatar_url: profile.avatar_url || "",
        cover_url: profile.cover_url || "",
        social_links: profile.social_links || {},
    };

    return (
        <div className="mx-auto max-w-5xl">
            <div className="theme-surface-panel mb-8 rounded-[2rem] px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">ACCOUNT SETTINGS</p>
                        <h1 className="mt-2 text-3xl font-bold text-theme">إعدادات الملف الشخصي</h1>
                    </div>
                    <p className="max-w-2xl text-sm text-theme-subtle">
                        {profile.role === "wushsha"
                            ? "قم بتحديث بياناتك لتظهر بشكل احترافي في معرضك الخاص"
                            : "قم بتحديث بياناتك الشخصية وحساباتك لتخصيص تجربتك في المنصة"}
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                <SettingsThemeSection />
                <ProfileForm initialData={initialData} userRole={profile.role as UserRole} />
            </div>
        </div>
    );
}
