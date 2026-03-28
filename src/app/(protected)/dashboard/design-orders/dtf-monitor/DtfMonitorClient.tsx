"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Image from "next/image";
import { ExternalLinkIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, SlashIcon, UserIcon } from "lucide-react";
import type { DtfStudioActivityLog } from "@/types/database";

interface DtfMonitorClientProps {
    initialLogs: DtfStudioActivityLog[];
    totalCount: number;
    currentPage: number;
}

export function DtfMonitorClient({ initialLogs, totalCount, currentPage }: DtfMonitorClientProps) {
    const totalPages = Math.ceil(totalCount / 50);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "success": return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
            case "error": return <AlertTriangleIcon className="w-5 h-5 text-red-400" />;
            case "timeout": return <RefreshCwIcon className="w-5 h-5 text-orange-400 font-bold" />;
            case "quota_exceeded": return <SlashIcon className="w-5 h-5 text-gold" />;
            default: return <AlertTriangleIcon className="w-5 h-5 text-neutral-400" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "success": return "ناجح";
            case "error": return "خطأ (مُعَلّق)";
            case "timeout": return "انقضاء الوقت";
            case "quota_exceeded": return "تجاوز الحد (سبام)";
            default: return status;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case "generate-mockup": return "توليد صورة";
            case "extract-design": return "عزل التصميم";
            default: return action;
        }
    };

    return (
        <div className="bg-surface/50 border border-gold/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-gold to-white bg-clip-text text-transparent">
                    سجل عمليات الذكاء الاصطناعي ({totalCount})
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-neutral-400 uppercase bg-surface/80 border-b border-gold/20">
                        <tr>
                            <th className="px-6 py-4 rounded-tr-xl">الحالة</th>
                            <th className="px-6 py-4">الإجراء</th>
                            <th className="px-6 py-4 w-1/3">صيغة الطلب (Prompt)</th>
                            <th className="px-6 py-4 text-center">النتيجة</th>
                            <th className="px-6 py-4 text-center">المستخدم</th>
                            <th className="px-6 py-4 rounded-tl-xl">التاريخ والوقت</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialLogs.map(log => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(log.status)}
                                        <span className={
                                            log.status === "error" ? "text-red-400" :
                                            log.status === "success" ? "text-green-400" :
                                            log.status === "quota_exceeded" ? "text-gold" : "text-orange-400"
                                        }>
                                            {getStatusLabel(log.status)}
                                        </span>
                                    </div>
                                    {log.error_message && (
                                        <p className="text-xs text-red-400/80 mt-1 max-w-[200px] truncate" title={log.error_message}>
                                            {log.error_message}
                                        </p>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-surface px-2 py-1 rounded text-gold/80 font-medium">
                                        {getActionLabel(log.action)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <p className="text-neutral-300 line-clamp-3 leading-relaxed" title={log.prompt || "بدون نص"}>
                                        {log.prompt || "نص تلقائي أو استخراج من الصورة"}
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {log.result_image_url ? (
                                        <div className="flex justify-center group">
                                            <a href={log.result_image_url} target="_blank" rel="noopener noreferrer" className="relative w-12 h-12 block rounded-lg overflow-hidden border border-gold/20 hover:border-gold transition-colors">
                                                <Image src={log.result_image_url} alt="Result" fill className="object-cover" unoptimized />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLinkIcon className="w-4 h-4 text-white" />
                                                </div>
                                            </a>
                                        </div>
                                    ) : (
                                        <span className="text-neutral-500">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {log.profile_id ? (
                                        <div className="flex flex-col items-center">
                                            <UserIcon className="w-5 h-5 text-gold/60 mb-1" />
                                            <span className="text-xs text-neutral-400 font-mono" title={log.profile_id}>
                                                {log.profile_id.slice(0,8)}...
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-neutral-500">مجهول</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-neutral-300">
                                    {format(new Date(log.created_at), "dd MMM yyyy - hh:mm a", { locale: ar })}
                                </td>
                            </tr>
                        ))}

                        {initialLogs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                                    لا توجد سجلات بعد لاستوديو الذكاء الاصطناعي.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gold/10 pt-4">
                    <span className="text-sm text-neutral-400">الصفحة {currentPage} من {totalPages}</span>
                    <div className="flex gap-2">
                        {currentPage > 1 && (
                            <a
                                href={`/dashboard/design-orders/dtf-monitor?page=${currentPage - 1}`}
                                className="px-4 py-2 bg-surface hover:bg-surface/80 text-white rounded-lg transition-colors text-sm"
                            >
                                السابق
                            </a>
                        )}
                        {currentPage < totalPages && (
                            <a
                                href={`/dashboard/design-orders/dtf-monitor?page=${currentPage + 1}`}
                                className="px-4 py-2 bg-gold hover:bg-gold/80 text-black font-medium rounded-lg transition-colors text-sm"
                            >
                                التالي
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
