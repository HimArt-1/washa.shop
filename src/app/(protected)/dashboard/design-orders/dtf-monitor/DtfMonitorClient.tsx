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
    const totalPages = Math.ceil(totalCount / 15);
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
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden">
            {/* Subtle glow orb */}
            <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-gold rounded-full shadow-[0_0_15px_rgba(212,175,55,0.8)]"></div>
                    <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-gold via-white to-white bg-clip-text text-transparent">
                            لوحة البيانات المباشرة
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1 font-medium tracking-wide">
                            سجل عمليات الذكاء الاصطناعي ({totalCount} عملية مسجلة)
                        </p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto relative z-10 border border-white/5 rounded-2xl bg-black/20">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-neutral-400 bg-surface/40 backdrop-blur-md border-b border-white/10 sticky top-0">
                        <tr>
                            <th className="px-6 py-5 font-bold tracking-wider text-gold/80">الحالة</th>
                            <th className="px-6 py-5 font-bold tracking-wider">الإجراء</th>
                            <th className="px-6 py-5 font-bold tracking-wider w-1/3">صيغة الطلب (Prompt)</th>
                            <th className="px-6 py-5 font-bold tracking-wider text-center">الخلاصة المدمجة</th>
                            <th className="px-6 py-5 font-bold tracking-wider text-center">المعرف</th>
                            <th className="px-6 py-5 font-bold tracking-wider">التوقيت</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialLogs.map(log => (
                            <tr key={log.id} 
                                onClick={() => setSelectedLog(log)}
                                className="border-b border-white/5 bg-transparent hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all duration-300 cursor-pointer group"
                            >
                                <td className="px-6 py-5 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(212,175,55,1)]" />
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg border ${log.status === "success" ? "bg-green-500/10 border-green-500/20" : log.status === "error" ? "bg-red-500/10 border-red-500/20" : log.status === "quota_exceeded" ? "bg-gold/10 border-gold/20" : "bg-orange-500/10 border-orange-500/20"} shadow-inner`}>
                                            {getStatusIcon(log.status)}
                                        </div>
                                        <span className={`font-bold tracking-wide ${
                                            log.status === "error" ? "text-red-400" :
                                            log.status === "success" ? "bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent" :
                                            log.status === "quota_exceeded" ? "text-gold" : "text-orange-400"
                                        }`}>
                                            {getStatusLabel(log.status)}
                                        </span>
                                    </div>
                                    {log.error_message && (
                                        <p className="text-xs text-red-400 mt-2 max-w-[200px] truncate bg-red-950/30 px-2 py-1 rounded inline-block border border-red-500/10" title={log.error_message}>
                                            تنبيه: {log.error_message}
                                        </p>
                                    )}
                                </td>
                                <td className="px-6 py-5">
                                    <span className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 px-3 py-1.5 rounded-md text-gold font-medium text-xs tracking-wider shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                                        {getActionLabel(log.action)}
                                    </span>
                                </td>
                                <td className="px-6 py-5 max-w-sm">
                                    <p className="text-neutral-300 line-clamp-2 leading-relaxed text-[13px] opacity-80 group-hover:opacity-100 transition-opacity" title={log.prompt || "بدون نص"}>
                                        {log.prompt || "--- (العملية مستقلة بدون محتوى نصي)"}
                                    </p>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {log.result_image_url ? (
                                        <div className="flex justify-center group/img" onClick={(e) => { e.stopPropagation(); window.open(log.result_image_url || undefined, '_blank'); }}>
                                            <div className="relative w-14 h-14 block rounded-xl overflow-hidden border border-white/10 hover:border-gold transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgb(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                                                <Image src={log.result_image_url} alt="Result" fill className="object-cover bg-black/50" unoptimized />
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all backdrop-blur-[2px]">
                                                    <ExternalLinkIcon className="w-5 h-5 text-gold drop-shadow-md" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-neutral-600 block bg-white/5 py-1.5 rounded-md text-xs border border-white/5">غير متاح</span>
                                    )}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {log.profile_id ? (
                                        <div className="flex flex-col items-center">
                                            <UserIcon className="w-4 h-4 text-gold/40 mb-1" />
                                            <span className="text-xs text-neutral-400 font-mono tracking-wider bg-black/30 px-2 py-0.5 rounded border border-white/5" title={log.profile_id}>
                                                {log.profile_id.slice(0,6)}..
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-neutral-600 text-xs tracking-wider">GUEST</span>
                                    )}
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-neutral-400 font-mono text-xs tracking-widest">
                                    {format(new Date(log.created_at), "dd MMM yy-HH:mm", { locale: ar })}
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
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-6 relative z-10">
                    <div className="bg-black/30 border border-white/5 px-4 py-1.5 rounded-full flex gap-2 items-center shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                        <span className="text-xs font-bold text-neutral-300 tracking-wider">صفحة {currentPage} <span className="opacity-50">من {totalPages}</span></span>
                    </div>
                    <div className="flex gap-3">
                        {currentPage > 1 && (
                            <a
                                href={`/dashboard/design-orders/dtf-monitor?page=${currentPage - 1}`}
                                className="px-5 py-2.5 bg-black/40 border border-white/10 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] text-neutral-300 hover:text-white rounded-xl transition-all duration-300 text-sm font-medium"
                            >
                                الصفحة السابقة
                            </a>
                        )}
                        {currentPage < totalPages && (
                            <a
                                href={`/dashboard/design-orders/dtf-monitor?page=${currentPage + 1}`}
                                className="px-5 py-2.5 bg-gradient-to-r from-gold/80 to-gold/60 border border-gold hover:from-gold hover:to-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] text-black font-bold rounded-xl transition-all duration-300 text-sm"
                            >
                                الصفحة التالية
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
            {selectedLog && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300"
                    onClick={() => setSelectedLog(null)}
                >
                    <div 
                        className="bg-bg/80 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden pb-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Terminal Scanline overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-20" />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                        
                        {/* Header */}
                        <div className="sticky top-0 bg-black/60 backdrop-blur-3xl z-20 border-b border-white/10 px-8 py-5 flex justify-between items-center shadow-[0_10px_30px_rgb(0,0,0,0.5)]">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <FileTextIcon className="w-6 h-6 text-gold drop-shadow-[0_0_5px_rgba(212,175,55,0.8)]" />
                                    <span>تشخيص النظام المتقدم</span>
                                </h3>
                                <p className="text-xs text-neutral-400 font-mono mt-1 tracking-widest pl-9">
                                    TRACE ID: {selectedLog.id.split('-').pop()?.toUpperCase()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2.5 text-neutral-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 border border-transparent rounded-xl transition-all duration-300 group">
                                <XIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10" dir="rtl">
                            {/* Right Column: Metadata */}
                            <div className="space-y-6">
                                {/* Status Card */}
                                <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center gap-5 shadow-inner">
                                    <div className={`p-4 rounded-xl border ${selectedLog.status === 'success' ? 'bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.2)]' : selectedLog.status === 'error' ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(248,113,113,0.2)]' : 'bg-gold/10 border-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]'}`}>
                                        {getStatusIcon(selectedLog.status)}
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-400 tracking-wider mb-1">حالة المعالجة</p>
                                        <p className={`text-lg font-bold tracking-wide ${selectedLog.status === 'success' ? 'text-green-400' : selectedLog.status === 'error' ? 'text-red-400' : 'text-gold'}`}>
                                            {getStatusLabel(selectedLog.status)}
                                        </p>
                                    </div>
                                </div>

                                {/* Information Box */}
                                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-5 shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                            <KeyIcon className="w-4 h-4 text-gold" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 tracking-wide mb-1">معرف المستخدم (PROFILE ID)</p>
                                            <p className="text-sm text-neutral-200 font-mono tracking-widest break-all bg-black/50 px-2 py-0.5 rounded border border-white/5">{selectedLog.profile_id || "GUEST_SESSION"}</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-white/5" />
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                            <ClockIcon className="w-4 h-4 text-gold" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 tracking-wide mb-1">الختم الزمني (TIMESTAMP)</p>
                                            <p className="text-sm text-neutral-200 font-mono tracking-widest" dir="ltr">{format(new Date(selectedLog.created_at), "PPPpp")}</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-white/5" />
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                            <RefreshCwIcon className="w-4 h-4 text-gold" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 tracking-wide mb-1">العملية المُوكلة (ACTION PROCESS)</p>
                                            <p className="text-sm text-gold font-medium tracking-wide">{getActionLabel(selectedLog.action)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Tracking (If any) */}
                                {selectedLog.error_message && (
                                    <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                                        <p className="text-xs text-red-400 mb-3 font-bold tracking-widest flex items-center gap-2">
                                            <AlertTriangleIcon className="w-4 h-4" />
                                            SYS_CRITICAL_ERROR
                                        </p>
                                        <div className="bg-black/60 p-4 rounded-xl border border-red-500/10">
                                            <p className="text-xs text-red-300 break-words font-mono leading-relaxed">
                                                {selectedLog.error_message}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Left Column: Visuals & Prompts */}
                            <div className="space-y-6">
                                {/* Prompt Box */}
                                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 shadow-inner">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-4 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
                                        <p className="text-sm text-neutral-300 font-bold tracking-wide">المدخلات (PROMPT_PAYLOAD)</p>
                                    </div>
                                    <div className="bg-[#0a0a0a] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                                        <p className={`text-sm leading-relaxed overflow-y-auto max-h-[150px] custom-scrollbar pr-2 ${selectedLog.prompt ? "text-green-400 font-mono" : "text-neutral-500"}`} dir="ltr">
                                            {selectedLog.prompt ? `> ${selectedLog.prompt}` : "> NO_PROMPT_PAYLOAD_DETECTED"}
                                        </p>
                                    </div>
                                </div>

                                {/* Results View */}
                                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 shadow-inner">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-4 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
                                        <p className="text-sm text-neutral-300 font-bold tracking-wide">مخرجات الشبكة (RENDERED_OUTPUT)</p>
                                    </div>
                                    
                                    {selectedLog.result_image_url ? (
                                        <a href={selectedLog.result_image_url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 hover:border-gold/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-500 group">
                                            <div className="absolute inset-0 bg-[#050505] animate-pulse" /> {/* Placeholder loading color */}
                                            <Image src={selectedLog.result_image_url} alt="Result Output" fill className="object-contain bg-black/60 z-10" unoptimized />
                                            {/* Scanner line effect */}
                                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold/50 shadow-[0_0_10px_rgba(212,175,55,1)] z-20 translate-y-[-100%] group-hover:translate-y-[500px] transition-transform duration-[2s] ease-linear repeat-infinite opacity-0 group-hover:opacity-100" />
                                            
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-30 backdrop-blur-[2px]">
                                                <div className="p-4 bg-black/50 border border-white/10 rounded-full mb-3 transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                                    <ExternalLinkIcon className="w-6 h-6 text-gold drop-shadow-md" />
                                                </div>
                                                <span className="text-white text-sm font-bold tracking-widest shadow-black drop-shadow-lg">ACCESS FULL RESOLUTION</span>
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="aspect-video w-full rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center bg-[#050505]">
                                            <div className="w-8 h-8 rounded-full border-t border-r border-neutral-600 animate-spin mb-3"></div>
                                            <span className="text-neutral-600 text-xs tracking-widest font-mono">AWAITING_RENDER_DATA</span>
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
