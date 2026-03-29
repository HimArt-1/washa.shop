import { getAuditLog } from "@/app/actions/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AuditLogClient } from "./AuditLogClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<{ page?: string; context?: string; search?: string }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const context = params.context || "all";
    const search = params.search || "";

    const { entries, total, totalPages } = await getAuditLog({ page, context, search });

    return (
        <div className="space-y-6">
            <AdminHeader
                title="سجل تغييرات الأدوار"
                subtitle={`${total.toLocaleString("ar-SA")} تغيير مسجّل — محمي ضد التعديل`}
                actions={
                    <Link
                        href="/dashboard/users"
                        className="px-4 py-2 text-xs text-theme-subtle hover:text-theme-soft border border-theme-subtle rounded-lg hover:bg-theme-subtle transition-all"
                    >
                        ← المستخدمون
                    </Link>
                }
            />
            <AuditLogClient
                entries={entries}
                total={total}
                totalPages={totalPages}
                currentPage={page}
                currentContext={context}
                currentSearch={search}
            />
        </div>
    );
}
