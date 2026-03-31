import { getAdminCommandCenterData, getAdminOverview } from "@/app/actions/admin";
import { 
    getDashboardAnalyticsBundle,
} from "@/app/actions/analytics";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { DashboardClient } from "./DashboardClient";

export default async function AdminDashboardPage() {
    const currentYear = new Date().getFullYear();
    
    const [overview, controlTower, analytics] = await Promise.all([
        getAdminOverview(),
        getAdminCommandCenterData(),
        getDashboardAnalyticsBundle(currentYear, {
            topProductsLimit: 5,
            lowStockThreshold: 5,
        }),
    ]);
    const { metrics, monthlyRevenue, topProducts, lowStock } = analytics;

    const { stats, recentOrders, pendingApplications } = overview;
    const dashboardStats = {
        totalUsers: metrics.totalUsers || stats.totalUsers,
        totalArtists: stats.totalArtists,
        totalPlatformSubscribers: stats.totalPlatformSubscribers,
        totalOrders: metrics.totalOrders,
        totalRevenue: metrics.totalRevenue,
        thisMonthRevenue: metrics.thisMonthRevenue,
        revenueGrowth: metrics.revenueGrowth,
        totalArtworks: stats.totalArtworks,
        totalProducts: stats.totalProducts,
        pendingApplications: stats.pendingApplications,
        totalNewsletterSubscribers: stats.totalNewsletterSubscribers,
        averageOrderValue: metrics.averageOrderValue,
    };
    const dataQualityIssues = [
        overview.error,
        controlTower.error,
        metrics.error,
        monthlyRevenue.error,
        topProducts.error,
        lowStock.error,
    ].filter(Boolean) as string[];

    return (
        <div className="space-y-8">
            <AdminHeader
                title="لوحة المؤشرات"
                subtitle="ملخص الشامل لأداء المنصة والمبيعات والمخزون والعملاء."
                actions={<AdminQuickActions pendingCount={stats.pendingApplications} />}
            />
            <DashboardClient
                stats={dashboardStats}
                recentOrders={recentOrders}
                pendingApplications={pendingApplications}
                controlTower={controlTower}
                topProductsList={topProducts.data || []}
                monthlyRevenue={monthlyRevenue.data}
                lowStockList={lowStock.data || []}
                dataQuality={{
                    degraded: dataQualityIssues.length > 0,
                    issues: dataQualityIssues,
                }}
            />
        </div>
    );
}
