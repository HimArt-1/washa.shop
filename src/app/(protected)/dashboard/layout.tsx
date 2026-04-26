import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminTopBar } from "@/components/admin/layout/AdminTopBar";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        const user = await getCurrentUserOrDevAdmin();
        if (!user) redirect("/sign-in");

        const { supabase, profile, isAdmin, bootstrapped } = await resolveAdminAccess(user);
        if (bootstrapped) {
            console.log("[Dashboard] Bootstrapped first admin for clerk_id:", user.id);
        }

        if (!profile || !isAdmin) {
            console.log("[Dashboard] Access denied for clerk_id:", user.id, "role:", profile?.role ?? null);
            redirect("/");
        }

        let pendingApps = 0;
        try {
            const { count } = await supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending");
            pendingApps = count ?? 0;
        } catch {
            pendingApps = 0;
        }

        let pendingDesignOrders = 0;
        try {
            const { count } = await supabase
                .from("custom_design_orders")
                .select("id", { count: "exact", head: true })
                .eq("status", "new");
            pendingDesignOrders = count ?? 0;
        } catch {
            pendingDesignOrders = 0;
        }

        let pendingSupportTickets = 0;
        try {
            const { count } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "open");
            pendingSupportTickets = count ?? 0;
        } catch {
            pendingSupportTickets = 0;
        }

        return (
            <div className="flex min-h-screen bg-bg relative" dir="rtl">
                {/* Cyber grid + gradient overlay */}
                <div className="fixed inset-0 pointer-events-none cyber-grid opacity-40" />
                <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-gold/[0.02] via-transparent to-transparent opacity-60" />
                <AdminSidebar role={profile.role} pendingApps={pendingApps} pendingDesignOrders={pendingDesignOrders} pendingSupportTickets={pendingSupportTickets} />
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <AdminTopBar />
                    <main className="flex-1 overflow-y-auto">
                        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        );
    } catch (err: unknown) {
        if (isRedirectError(err)) throw err;
        // Re-throw Next.js internal errors (e.g. DYNAMIC_SERVER_USAGE during build)
        if (typeof err === "object" && err !== null && "digest" in err) {
            const d = (err as { digest?: string }).digest;
            if (d === "DYNAMIC_SERVER_USAGE" || d === "NEXT_NOT_FOUND") throw err;
        }
        console.error("[Dashboard] Fatal error:", err);
        redirect("/");
    }
}
