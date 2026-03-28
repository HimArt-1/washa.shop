import { getAdminList, getDesignOperationsSnapshot, getDesignOrders, getDesignPromptTemplate } from "@/app/actions/smart-store";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DesignOperationsCenter } from "@/components/admin/design-orders/DesignOperationsCenter";
import type { CustomDesignOrderStatus } from "@/types/database";
import Link from "next/link";
import { ActivityIcon } from "lucide-react";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams?: Promise<{ page?: string; status?: string; admin?: string; search?: string }>;
}

export default async function DesignOrdersPage({ searchParams }: PageProps) {
    const params = (await searchParams) ?? {} as Record<string, string | undefined>;
    const page = Number(params.page) || 1;
    const status = (params.status || "all") as CustomDesignOrderStatus | "all";

    const [ordersResult, promptTemplate, adminList, snapshot, user] = await Promise.all([
        getDesignOrders(page, status),
        getDesignPromptTemplate(),
        getAdminList(),
        getDesignOperationsSnapshot(),
        getCurrentUserOrDevAdmin(),
    ]);

    const { profile } = user ? await resolveAdminAccess(user) : { profile: null };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <AdminHeader
                    title="مركز عمليات التصميم"
                    subtitle="غرفة تشغيل لإدارة الوارد، التنفيذ، المراجعة، التعيين، والتسليم داخل مسار التصميم المخصص."
                />
                {profile?.role === "admin" && (
                    <Link
                        href="/dashboard/design-orders/dtf-monitor"
                        className="flex flex-shrink-0 items-center gap-2 px-4 py-2 bg-surface hover:bg-gold/10 border border-gold/20 rounded-xl shadow-lg text-gold/80 hover:text-gold transition-all text-sm font-medium cyber-border-gold relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gold/5 blur-xl group-hover:bg-gold/20 transition-all opacity-0 group-hover:opacity-100" />
                        <ActivityIcon className="w-4 h-4 animate-pulse" />
                        رادار استوديو DTF
                    </Link>
                )}
            </div>
            <DesignOperationsCenter
                snapshot={snapshot}
                clientProps={{
                    orders: ordersResult.data,
                    count: ordersResult.count,
                    totalPages: ordersResult.totalPages,
                    currentPage: page,
                    currentStatus: status,
                    promptTemplate,
                    stats: {
                        new: snapshot.stats.new,
                        in_progress: snapshot.stats.in_progress,
                        awaiting_review: snapshot.stats.awaiting_review,
                        modification_requested: snapshot.stats.modification_requested,
                        completed: snapshot.stats.completed,
                        cancelled: snapshot.stats.cancelled,
                        revenue: snapshot.stats.revenue,
                    },
                    adminList,
                }}
            />
        </div>
    );
}
