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
                <h1 className="text-3xl font-bold text-ink">لوحة التحكم</h1>
                <p className="text-ink/60 mt-2">مرحباً بك في استوديو وشّى، إليك ملخص نشاطك.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-ink/5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gold/10 rounded-xl text-gold">
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-ink/60 text-sm font-medium">{stat.title}</h3>
                        <p className="text-2xl font-bold text-ink mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions / Recent Activity Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-ink/5 p-8 min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-sand rounded-full flex items-center justify-center text-gold">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-ink">تحليلات الأداء (قريباً)</h3>
                    <p className="text-ink/50 max-w-sm">سنقوم بإضافة رسوم بيانية مفصلة عن مبيعاتك خلال الفترة القادمة.</p>
                </div>

                <div className="bg-gradient-to-br from-gold/10 to-sand/30 rounded-3xl border border-gold/10 p-8 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-ink mb-2">ابدأ البيع الآن</h3>
                        <p className="text-ink/60 text-sm">لديك أفكار جديدة؟ حولها إلى منتجات في دقائق.</p>
                    </div>
                    <Link href="/studio/artworks/upload" className="btn-gold w-full py-3 text-center mt-6 shadow-lg shadow-gold/20 block">
                        رفع عمل جديد
                    </Link>
                </div>
            </div>
        </div>
    );
}
