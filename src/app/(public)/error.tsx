"use client";

import { useEffect } from "react";

export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[WASHA Error]", error);
    }, [error]);

    return (
        <div
            className="min-h-screen bg-bg flex items-center justify-center px-4"
            dir="rtl"
        >
            <div className="text-center max-w-md">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                    </svg>
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-theme mb-3">
                    حدث خطأ غير متوقع
                </h1>
                <p className="text-theme-subtle text-sm mb-8 leading-relaxed">
                    نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="btn-gold py-3 px-8 cursor-pointer"
                    >
                        إعادة المحاولة
                    </button>
                    <a
                        href="/"
                        className="py-3 px-8 border border-gold/20 rounded-xl text-gold/80 hover:bg-gold/5 transition-colors text-center"
                    >
                        الصفحة الرئيسية
                    </a>
                </div>

                {/* Error Digest */}
                {error.digest && (
                    <p className="mt-8 text-xs text-theme-faint font-mono">
                        رمز الخطأ: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
