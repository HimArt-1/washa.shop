import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side admin role check
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        redirect("/studio");
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
}
