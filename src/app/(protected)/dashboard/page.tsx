import { getAdminCommandCenterData, getAdminOverview } from "@/app/actions/admin";
import { 
    getDashboardMetrics, 
    getRevenueByMonth, 
    getTopSellingProducts, 
    getLowStockAlerts 
} from "@/app/actions/analytics";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { DashboardClient } from "./DashboardClient";

export default async function AdminDashboardPage() {
    const currentYear = new Date().getFullYear();
    
    // Fetch overview for the KPI top cards and recent orders
    // Plus the new deep analytics data
    const [overview, controlTower, metrics, monthlyRevenue, topProducts, lowStock] = await Promise.all([
        getAdminOverview(),
        getAdminCommandCenterData(),
        getDashboardMetrics(),
        getRevenueByMonth(currentYear),
        getTopSellingProducts(5),
        getLowStockAlerts(5)
    ]);

    const { stats, recentOrders, pendingApplications } = overview;

    return (
        <div className="space-y-8">
            <AdminHeader
                title="لوحة المؤشرات"
                subtitle="ملخص الشامل لأداء المنصة والمبيعات والمخزون والعملاء."
                actions={<AdminQuickActions pendingCount={stats.pendingApplications} />}
            />
            <DashboardClient
                stats={{...stats, ...metrics}}
                recentOrders={recentOrders}
                pendingApplications={pendingApplications}
                controlTower={controlTower}
                topProductsList={topProducts.data || []}
                monthlyRevenue={monthlyRevenue}
                lowStockList={lowStock.data || []}
            />
        </div>
    );
}
