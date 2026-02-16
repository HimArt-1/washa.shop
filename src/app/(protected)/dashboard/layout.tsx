import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        // Server-side admin role check
        const user = await currentUser();
        if (!user) redirect("/sign-in");

        const supabase = getAdminSupabase();
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("clerk_id", user.id)
            .single();

        if (error) {
            console.error("[Dashboard] Profile fetch error:", error.message, "clerk_id:", user.id);
        }

        if (!profile || profile.role !== "admin") {
            console.log("[Dashboard] Access denied for clerk_id:", user.id, "role:", profile?.role);
            redirect("/");
        }

        // Get pending applications count for sidebar badge
        const { count: pendingApps } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");

        return (
            <div className="flex min-h-screen bg-bg" dir="rtl">
                <AdminSidebar pendingApps={pendingApps || 0} />
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        );
    } catch (err: any) {
        // If it's a redirect, re-throw it (Next.js uses thrown redirects)
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
            throw err;
        }
        console.error("[Dashboard] Fatal error:", err);
        redirect("/");
    }
}
