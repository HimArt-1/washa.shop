import { Suspense } from "react";
import { getAdminOverview } from "@/app/actions/admin";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
    Users,
    Palette,
    ShoppingCart,
    DollarSign,
    Package,
    FileText,
    Mail,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
    const overview = await getAdminOverview();
    const { stats, recentOrders, pendingApplications } = overview;

    return (
        <div className="space-y-8">
            {/* ─── Header ─── */}
            <div>
                <h1 className="text-3xl font-bold text-fg">نظرة عامة</h1>
                <p className="text-fg/40 mt-1">مرحباً بك في لوحة إدارة وشّى — إليك ملخص أداء المنصة.</p>
            </div>

            {/* ─── Stats Grid ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="إجمالي الإيرادات"
                    value={`${stats.totalRevenue.toLocaleString()} ر.س`}
                    icon={DollarSign}
                    variant="gold"
                    growth={stats.revenueGrowth}
                    subtitle={`هذا الشهر: ${stats.thisMonthRevenue.toLocaleString()} ر.س`}
                    delay={0}
                />
                <StatCard
                    title="الطلبات"
                    value={stats.totalOrders}
                    icon={ShoppingCart}
                    variant="forest"
                    delay={0.05}
                />
                <StatCard
                    title="الفنانون"
                    value={stats.totalArtists}
                    icon={Palette}
                    variant="accent"
                    subtitle={`من أصل ${stats.totalUsers} مستخدم`}
                    delay={0.1}
                />
                <StatCard
                    title="طلبات الانضمام"
                    value={stats.pendingApplications}
                    icon={FileText}
                    variant={stats.pendingApplications > 0 ? "gold" : "default"}
                    subtitle={stats.pendingApplications > 0 ? "بانتظار المراجعة" : "لا توجد طلبات معلقة"}
                    delay={0.15}
                />
            </div>

            {/* ─── Secondary Stats ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard title="المستخدمون" value={stats.totalUsers} icon={Users} delay={0.2} />
                <StatCard title="المشترون" value={stats.totalBuyers} icon={Users} delay={0.25} />
                <StatCard title="الأعمال الفنية" value={stats.totalArtworks} icon={Palette} delay={0.3} />
                <StatCard title="المشتركون" value={stats.totalSubscribers} icon={Mail} delay={0.35} />
            </div>

            {/* ─── Bottom Grid: Recent Orders + Pending Apps ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <h3 className="font-bold text-fg text-sm">آخر الطلبات</h3>
                        <Link href="/dashboard/orders" className="text-xs text-gold hover:text-gold-light transition-colors">
                            عرض الكل ←
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.04]">
                                    <th className="text-right px-6 py-3 text-fg/30 font-medium text-xs">رقم الطلب</th>
                                    <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">المشتري</th>
                                    <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">المبلغ</th>
                                    <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">الحالة</th>
                                    <th className="text-right px-6 py-3 text-fg/30 font-medium text-xs">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.length > 0 ? recentOrders.map((order: any) => (
                                    <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-3.5 font-mono text-xs text-gold">{order.order_number}</td>
                                        <td className="px-4 py-3.5 text-fg/70">{order.buyer?.display_name || "—"}</td>
                                        <td className="px-4 py-3.5 font-bold text-fg">{Number(order.total).toLocaleString()} ر.س</td>
                                        <td className="px-4 py-3.5"><StatusBadge status={order.status} type="order" /></td>
                                        <td className="px-6 py-3.5 text-fg/30 text-xs" dir="ltr">
                                            {new Date(order.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-fg/20 text-sm">لا توجد طلبات بعد</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending Applications */}
                <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <h3 className="font-bold text-fg text-sm">طلبات الانضمام</h3>
                        <Link href="/dashboard/applications" className="text-xs text-gold hover:text-gold-light transition-colors">
                            عرض الكل ←
                        </Link>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                        {pendingApplications.length > 0 ? pendingApplications.map((app: any) => (
                            <div key={app.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-fg text-sm">{app.full_name}</span>
                                    <span className="text-[10px] text-fg/20">
                                        {new Date(app.created_at).toLocaleDateString("ar-SA")}
                                    </span>
                                </div>
                                <p className="text-fg/40 text-xs">{app.art_style} · {app.email}</p>
                            </div>
                        )) : (
                            <div className="px-6 py-12 text-center text-fg/20 text-sm">
                                لا توجد طلبات معلقة
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
