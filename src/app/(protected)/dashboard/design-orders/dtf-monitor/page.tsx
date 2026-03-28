import { AdminHeader } from "@/components/admin/AdminHeader";
import { getDtfTelemetryLogs } from "@/app/actions/dtf-telemetry";
import { DtfMonitorClient } from "./DtfMonitorClient";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams?: Promise<{ page?: string }>;
}

export default async function DtfMonitorPage({ searchParams }: PageProps) {
    const params = (await searchParams) ?? {} as Record<string, string | undefined>;
    const page = Number(params.page) || 1;

    const { data: logs, count, error } = await getDtfTelemetryLogs(page, 50);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/design-orders"
                    className="p-2 hover:bg-gold/10 text-gold/60 hover:text-gold rounded-lg transition-colors"
                >
                    <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <AdminHeader
                    title="رادار استوديو الذكاء الاصطناعي (DTF)"
                    subtitle="مراقبة حية، كشف الأخطاء، وسجل نبضات نظام توليد التصاميم لترشيد الاستهلاك وحل الشكاوى."
                />
            </div>

            {error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
                    حدث خطأ أثناء جلب السجلات: {error}
                </div>
            ) : (
                <DtfMonitorClient initialLogs={logs} totalCount={count} currentPage={page} />
            )}
        </div>
    );
}
