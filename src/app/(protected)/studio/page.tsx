import { Suspense } from "react";
import { getArtistStats } from "@/app/actions/studio";
import { Eye, Heart, TrendingUp, DollarSign, Package } from "lucide-react";
import Link from "next/link";

export default async function StudioDashboard() {
    const stats = await getArtistStats();

    const statItems = [
        {
            title: "إجمالي المبيعات",
            value: stats ? stats.totalRevenue.toLocaleString() + " ر.س" : "0 ر.س",
            icon: DollarSign,
        },
        {
            title: "الطلبات المباعة",
            value: stats ? stats.totalSales : "0",
            icon: Package,
        },
        {
            title: "المشاهدات",
            value: stats ? stats.totalViews.toLocaleString() : "0",
            icon: Eye,
        },
        {
            title: "الإعجابات",
            value: stats ? stats.totalLikes.toLocaleString() : "0",
            icon: Heart,
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-theme">لوحة التحكم</h1>
                <p className="text-theme-subtle mt-2">مرحباً بك في استوديو وشّى، إليك ملخص نشاطك.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {statItems.map((stat, i) => (
                    <div key={i} className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm p-5 sm:p-6 hover:border-gold/20 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gold/10 rounded-xl text-gold">
                                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                        </div>
                        <h3 className="text-theme-subtle text-sm font-medium">{stat.title}</h3>
                        <p className="text-2xl font-bold text-theme mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions / Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm p-6 sm:p-8 min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center text-gold">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-theme">تحليلات الأداء (قريباً)</h3>
                    <p className="text-theme-faint max-w-sm">سنقوم بإضافة رسوم بيانية مفصلة عن مبيعاتك خلال الفترة القادمة.</p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-surface border border-gold/10 p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-theme mb-2">ابدأ البيع الآن</h3>
                        <p className="text-theme-subtle text-sm">لديك أفكار جديدة؟ حولها إلى منتجات في دقائق.</p>
                    </div>
                    <Link href="/studio/artworks/upload" className="btn-gold w-full py-3 text-center mt-6 block rounded-xl">
                        رفع عمل جديد
                    </Link>
                </div>
            </div>
        </div>
    );
}
