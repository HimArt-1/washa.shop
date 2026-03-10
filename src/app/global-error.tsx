"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[WASHA Global Error]", error);
    }, [error]);

    return (
        <html lang="ar" dir="rtl">
            <body>
                <div
                    className="min-h-screen bg-bg flex items-center justify-center px-4"
                    dir="rtl"
                >
                    <div className="text-center max-w-md">
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
                        <h1 className="text-2xl font-bold text-theme mb-3">
                            حدث خطأ غير متوقع
                        </h1>
                        <p className="text-theme-subtle text-sm mb-8 leading-relaxed">
                            نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.
                        </p>
                        <button
                            onClick={reset}
                            className="btn-gold py-3 px-8 cursor-pointer"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
