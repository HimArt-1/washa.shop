import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home, Sparkles } from "lucide-react";
import DesignTrackerClient from "./DesignTrackerClient";

export const metadata: Metadata = {
    title: "تتبع طلب التصميم",
    description: "تتبع حالة طلب التصميم المخصص الخاص بك وتواصل مع فريق التصميم.",
};

export default async function DesignTrackerPage({
    searchParams,
}: {
    searchParams: Promise<{ order?: string; token?: string }>;
}) {
    const params = await searchParams;
    const orderId = params.order;
    const trackerToken = params.token;

    if (!orderId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-theme-soft mb-2">رقم الطلب مفقود</h2>
                    <p className="text-theme-subtle text-sm">الرجاء استخدام رابط صالح لتتبع الطلب.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 sm:py-16">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
                {/* Header */}
                <div className="theme-surface-panel mb-8 rounded-[2rem] px-6 py-6 sm:px-8 sm:py-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">DESIGN TRACKER</p>
                            <h1 className="mt-2 text-2xl font-bold text-theme sm:text-3xl">
                                تتبع <span className="text-gradient">التصميم</span>
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-theme-faint">
                                تابع حالة طلبك، راجع النتائج فور جهوزيتها، وابقَ على تواصل مع فريق التصميم من شاشة واحدة.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/design"
                                className="inline-flex items-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-4 py-2.5 text-xs text-theme-faint transition-colors hover:border-gold/25 hover:text-gold"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                صمّم قطعتك
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2.5 text-xs font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold-light"
                            >
                                <Home className="h-4 w-4" />
                                الرئيسية
                            </Link>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-[11px] font-bold text-gold">
                            <Sparkles className="h-3.5 w-3.5" />
                            مراجعة النتائج والاعتماد من نفس الصفحة
                        </span>
                    </div>
                </div>

                <DesignTrackerClient orderId={orderId} trackerToken={trackerToken} />
            </div>
        </div>
    );
}
