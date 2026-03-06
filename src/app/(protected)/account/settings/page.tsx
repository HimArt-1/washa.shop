import { getProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { type ProfileFormData } from "@/lib/validations";

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
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-fg">إعدادات الملف الشخصي</h1>
                <p className="text-fg/50 mt-2">
                    {profile.role === "wushsha"
                        ? "قم بتحديث بياناتك لتظهر بشكل احترافي في معرضك الخاص"
                        : "قم بتحديث بياناتك الشخصية وحساباتك لتخصيص تجربتك في المنصة"}
                </p>
            </div>

            <ProfileForm initialData={initialData} userRole={profile.role} />
        </div>
    );
}
