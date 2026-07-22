"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
    updateBoardManualPrintStatus,
    type BoardRequestAdminRow,
} from "@/app/actions/board-requests";
import type {
    BoardManualPrintFilter,
    BoardRequestStatusFilter,
} from "@/lib/board-request-filters";
import type { WashaBoardManualPrintStatus } from "@/types/database";
import { BoardRequestCard } from "./BoardRequestCard";

const MANUAL_FILTERS: Array<{ value: BoardManualPrintFilter; label: string }> = [
    { value: "pending", label: "بانتظار التنفيذ" },
    { value: "in_progress", label: "قيد التنفيذ" },
    { value: "completed", label: "مكتمل" },
    { value: "all", label: "الكل" },
];

export function BoardRequestsClient({
    rows,
    status,
    manualPrintStatus,
}: {
    rows: BoardRequestAdminRow[];
    status: BoardRequestStatusFilter;
    manualPrintStatus: BoardManualPrintFilter;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingRowId, setPendingRowId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleStatusChange = (
        boardRequestId: string,
        nextStatus: WashaBoardManualPrintStatus
    ) => {
        setPendingRowId(boardRequestId);
        setError(null);
        startTransition(async () => {
            try {
                const result = await updateBoardManualPrintStatus({
                    boardRequestId,
                    manualPrintStatus: nextStatus,
                });
                if (!result.success) {
                    setError(result.error);
                    return;
                }
                router.refresh();
            } catch {
                setError("تعذّر تحديث حالة الطلب.");
            } finally {
                setPendingRowId(null);
            }
        });
    };

    return (
        <div className="space-y-5">
            <nav aria-label="فلترة حالة طلبات اللوحات" className="flex flex-wrap gap-2">
                <Link
                    href="/dashboard/board-requests?status=ready&manual_print_status=pending"
                    aria-current={status === "ready" ? "page" : undefined}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold ${status === "ready" ? "border-gold/30 bg-gold/10 text-gold" : "border-theme-subtle text-theme-subtle"}`}
                >
                    الجاهزة
                </Link>
                <Link
                    href="/dashboard/board-requests?status=failed"
                    aria-current={status === "failed" ? "page" : undefined}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold ${status === "failed" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-theme-subtle text-theme-subtle"}`}
                >
                    الفاشلة
                </Link>
            </nav>

            {status === "ready" ? (
                <nav aria-label="فلترة حالة التركيب اليدوي" className="flex flex-wrap gap-2">
                    {MANUAL_FILTERS.map((filter) => (
                        <Link
                            key={filter.value}
                            href={`/dashboard/board-requests?status=ready&manual_print_status=${filter.value}`}
                            aria-current={manualPrintStatus === filter.value ? "page" : undefined}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${manualPrintStatus === filter.value ? "border-theme-soft bg-theme-subtle text-theme" : "border-theme-subtle text-theme-faint"}`}
                        >
                            {filter.label}
                        </Link>
                    ))}
                </nav>
            ) : null}

            {error ? (
                <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {error}
                </p>
            ) : null}

            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-theme-subtle p-10 text-center text-sm text-theme-subtle">
                    {status === "ready" ? "لا توجد لوحات جاهزة ضمن هذا الفلتر." : "لا توجد طلبات board فاشلة."}
                </div>
            ) : (
                <div className="space-y-5">
                    {rows.map((row) => (
                        <BoardRequestCard
                            key={row.id}
                            row={row}
                            isPending={isPending && pendingRowId === row.id}
                            onStatusChange={(nextStatus) => handleStatusChange(row.id, nextStatus)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
