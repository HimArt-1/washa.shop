"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Dashboard Error]", error?.message, error?.digest);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4" dir="rtl">
            <div className="text-center max-w-md">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-theme mb-2">حدث خطأ في لوحة الإدارة</h2>
                <p className="text-theme-subtle text-sm mb-6">
                    تأكد من إعداد متغيرات البيئة (Supabase) وأن حسابك له صلاحية مسؤول. إن استمر الخطأ، جرّب تسجيل الخروج ثم الدخول مرة أخرى.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <button type="button" onClick={reset} className="btn-gold py-2.5 px-6 text-sm cursor-pointer">
                        إعادة المحاولة
                    </button>
                    <Link href="/" className="py-2.5 px-6 border border-white/20 rounded-xl text-theme-soft hover:bg-theme-subtle text-sm transition-colors">
                        الصفحة الرئيسية
                    </Link>
                    <Link href="/dashboard" className="py-2.5 px-6 border border-gold/30 rounded-xl text-gold/90 hover:bg-gold/10 text-sm transition-colors">
                        لوحة الإدارة
                    </Link>
                </div>
                {error?.digest && (
                    <p className="mt-6 text-xs text-theme-faint font-mono">رمز: {error.digest}</p>
                )}
            </div>
        </div>
    );
}
