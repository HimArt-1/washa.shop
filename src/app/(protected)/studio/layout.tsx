import { Sidebar } from "@/components/studio/layout/Sidebar";
import { StudioAccessDenied } from "@/components/studio/StudioAccessDenied";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPublicVisibility } from "@/app/actions/settings";
import { isStudioRole } from "@/lib/studio-access";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
    const [profile, visibility] = await Promise.all([
        ensureProfile(),
        getPublicVisibility(),
    ]);

    if (!profile || !isStudioRole(profile.role)) {
        return <StudioAccessDenied showJoinArtist={visibility.join_artist} />;
    }

    return (
        <div className="flex min-h-screen bg-bg" dir="rtl">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
