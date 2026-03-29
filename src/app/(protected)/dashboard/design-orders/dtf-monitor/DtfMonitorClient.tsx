"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Image from "next/image";
import { ExternalLinkIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, SlashIcon, UserIcon, XIcon, FileTextIcon, KeyIcon, ClockIcon } from "lucide-react";
import type { DtfStudioActivityLog } from "@/types/database";

interface DtfMonitorClientProps {
    initialLogs: DtfStudioActivityLog[];
    totalCount: number;
    currentPage: number;
}

export function DtfMonitorClient({ initialLogs, totalCount, currentPage }: DtfMonitorClientProps) {
    const totalPages = Math.ceil(totalCount / 50);
    const [selectedLog, setSelectedLog] = useState<DtfStudioActivityLog | null>(null);

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
        <>
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
                            <tr key={log.id} 
                                onClick={() => setSelectedLog(log)}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                            >
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
                                        <div className="flex justify-center group" onClick={(e) => { e.stopPropagation(); window.open(log.result_image_url || undefined, '_blank'); }}>
                                            <div className="relative w-12 h-12 block rounded-lg overflow-hidden border border-gold/20 hover:border-gold transition-colors cursor-pointer">
                                                <Image src={log.result_image_url} alt="Result" fill className="object-cover" unoptimized />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLinkIcon className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
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
            {selectedLog && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setSelectedLog(null)}
                >
                    <div 
                        className="bg-bg border border-gold/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-gold/10 cyber-border-gold pb-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-bg/95 backdrop-blur-xl z-10 border-b border-gold/20 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileTextIcon className="w-5 h-5 text-gold" />
                                تفاصيل العملية {selectedLog.id.split('-')[0]}
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 text-neutral-400 hover:text-white bg-surface hover:bg-white/5 rounded-full transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
                            {/* Right Column: Metadata */}
                            <div className="space-y-6">
                                {/* Status Card */}
                                <div className="bg-surface/50 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${selectedLog.status === 'success' ? 'bg-green-500/10' : selectedLog.status === 'error' ? 'bg-red-500/10' : 'bg-gold/10'}`}>
                                        {getStatusIcon(selectedLog.status)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-400">حالة العملية</p>
                                        <p className={`font-bold ${selectedLog.status === 'success' ? 'text-green-400' : selectedLog.status === 'error' ? 'text-red-400' : 'text-gold'}`}>
                                            {getStatusLabel(selectedLog.status)}
                                        </p>
                                    </div>
                                </div>

                                {/* Information Box */}
                                <div className="bg-surface/50 border border-white/5 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <KeyIcon className="w-5 h-5 text-gold/60" />
                                        <div>
                                            <p className="text-xs text-neutral-400">معرف المستخدم (Profile ID)</p>
                                            <p className="text-sm text-white font-mono break-all">{selectedLog.profile_id || "غير متوفر"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ClockIcon className="w-5 h-5 text-gold/60" />
                                        <div>
                                            <p className="text-xs text-neutral-400">التوقيت الدقيق</p>
                                            <p className="text-sm text-white" dir="ltr">{format(new Date(selectedLog.created_at), "PPPpp")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <RefreshCwIcon className="w-5 h-5 text-gold/60" />
                                        <div>
                                            <p className="text-xs text-neutral-400">نوع الإجراء</p>
                                            <p className="text-sm text-white">{getActionLabel(selectedLog.action)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Tracking (If any) */}
                                {selectedLog.error_message && (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                        <p className="text-xs text-red-400/80 mb-2 font-bold">⚠️ رسالة الخطأ التقنية</p>
                                        <p className="text-sm text-red-300 break-words font-mono bg-black/20 p-3 rounded-lg">
                                            {selectedLog.error_message}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Left Column: Visuals & Prompts */}
                            <div className="space-y-6">
                                {/* Prompt Box */}
                                <div className="bg-surface/50 border border-gold/10 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileTextIcon className="w-4 h-4 text-gold" />
                                        <p className="text-sm text-gold font-bold">النص المُدخل (Prompt)</p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                        <p className="text-sm text-neutral-200 leading-relaxed break-words" dir="auto">
                                            {selectedLog.prompt || "لا يوجد نص. (العملية غالباً اعتمدت على استخراج صورة فقط)"}
                                        </p>
                                    </div>
                                </div>

                                {/* Results View */}
                                <div className="bg-surface/50 border border-gold/10 rounded-xl p-4">
                                    <p className="text-sm text-gold font-bold mb-4">الصورة الناتجة</p>
                                    {selectedLog.result_image_url ? (
                                        <a href={selectedLog.result_image_url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square w-full rounded-xl overflow-hidden border border-white/10 hover:border-gold transition-colors group">
                                            <Image src={selectedLog.result_image_url} alt="Result" fill className="object-contain bg-black/20" unoptimized />
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <ExternalLinkIcon className="w-8 h-8 text-white mb-2" />
                                                <span className="text-white text-sm font-medium">فتح بالحجم الأصلي</span>
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="aspect-video w-full rounded-xl border border-dashed border-white/10 flex items-center justify-center bg-black/20">
                                            <span className="text-neutral-500 text-sm">لم يتم توليد صورة</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
