import type { Metadata } from "next";
import DesignTrackerClient from "./DesignTrackerClient";

export const metadata: Metadata = {
    title: "تتبع طلب التصميم",
    description: "تتبع حالة طلب التصميم المخصص الخاص بك وتواصل مع فريق التصميم.",
};

export default async function DesignTrackerPage({
    searchParams,
}: {
    searchParams: Promise<{ order?: string }>;
}) {
    const params = await searchParams;
    const orderId = params.order;

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

            <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-2xl sm:text-3xl font-bold text-theme mb-2">
                        تتبع <span className="text-gradient">التصميم</span>
                    </h1>
                    <p className="text-theme-subtle text-sm">تابع حالة طلبك وتواصل مع فريق التصميم</p>
                </div>

                <DesignTrackerClient orderId={orderId} />
            </div>
        </div>
    );
}
