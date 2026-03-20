import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { getOperationalRules } from "@/lib/operational-rules";

function shouldEmitLiveOperationalEscalations() {
    return (
        process.env.VERCEL_ENV === "production" &&
        process.env.NEXT_PHASE !== "phase-production-build"
    );
}

export async function emitSupportServiceEscalations(snapshot: {
    stats: {
        urgentOpen: number;
        staleActive: number;
        slaAtRisk: number;
        slaBreached: number;
    };
}) {
    if (!shouldEmitLiveOperationalEscalations()) return;
    const rules = await getOperationalRules();

    if (rules.support.slaBreachedMin > 0 && snapshot.stats.slaBreached >= rules.support.slaBreachedMin) {
        await reportAdminOperationalAlert({
            dispatchKey: "support:sla_breached",
            bucketMs: 30 * 60 * 1000,
            category: "support",
            severity: "critical",
            title: "تذاكر دعم تجاوزت SLA",
            message: `يوجد ${snapshot.stats.slaBreached} تذاكر تجاوزت SLA حاليًا وتحتاج تدخلاً فوريًا من فريق الدعم.`,
            source: "support.escalation.sla_breached",
            link: "/dashboard/support",
            resourceType: "support_ticket",
            metadata: {
                sla_breached: snapshot.stats.slaBreached,
                sla_at_risk: snapshot.stats.slaAtRisk,
                urgent_open: snapshot.stats.urgentOpen,
                stale_active: snapshot.stats.staleActive,
            },
        });
        return;
    }

    if (rules.support.slaAtRiskMin > 0 && snapshot.stats.slaAtRisk >= rules.support.slaAtRiskMin) {
        await reportAdminOperationalAlert({
            dispatchKey: "support:sla_at_risk",
            bucketMs: 45 * 60 * 1000,
            category: "support",
            severity: "warning",
            title: "تذاكر دعم تقترب من تجاوز SLA",
            message: `يوجد ${snapshot.stats.slaAtRisk} تذاكر على حافة تجاوز SLA. راقب الإيقاع قبل تحولها إلى تعثر فعلي.`,
            source: "support.escalation.sla_at_risk",
            link: "/dashboard/support",
            resourceType: "support_ticket",
            metadata: {
                sla_at_risk: snapshot.stats.slaAtRisk,
                urgent_open: snapshot.stats.urgentOpen,
                stale_active: snapshot.stats.staleActive,
            },
        });
    }
}

export async function emitInventoryRiskEscalations(params: {
    inventory: any[];
    stats: {
        lowStock: number;
        outOfStock: number;
    } | null;
    fulfillmentStats: {
        pendingReview: number;
        fulfillmentQueue: number;
        paymentPending: number;
        delivered: number;
        todayOrders: number;
    };
}) {
    if (!shouldEmitLiveOperationalEscalations()) return;
    const rules = await getOperationalRules();

    const criticalStockouts = params.inventory.filter((item) => {
        const quantity = Number(item.quantity) || 0;
        const soldCount = Number(item.sold_count) || 0;
        return quantity === 0 && soldCount > 0;
    });

    const highPressureRestocks = params.inventory.filter((item) => {
        const quantity = Number(item.quantity) || 0;
        const soldCount = Number(item.sold_count) || 0;
        return quantity > 0 && quantity <= 2 && (soldCount > quantity || soldCount >= 4);
    });

    if (rules.inventory.criticalStockoutsMin > 0 && criticalStockouts.length >= rules.inventory.criticalStockoutsMin) {
        const shouldEscalateAsCritical =
            rules.inventory.fulfillmentQueueCriticalMin > 0 &&
            params.fulfillmentStats.fulfillmentQueue >= rules.inventory.fulfillmentQueueCriticalMin;

        await reportAdminOperationalAlert({
            dispatchKey: "inventory:critical_stockouts",
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: shouldEscalateAsCritical ? "critical" : "warning",
            title:
                shouldEscalateAsCritical
                    ? "نفاد مخزون يهدد التنفيذ"
                    : "نفاد مخزون يحتاج تعبئة عاجلة",
            message:
                shouldEscalateAsCritical
                    ? `يوجد ${criticalStockouts.length} عناصر نافدة مع طلبات في خط التنفيذ الحالي. راجع مركز التنفيذ والمخزون فورًا.`
                    : `يوجد ${criticalStockouts.length} عناصر نافدة ولها سحب فعلي من المبيعات. راجع أولويات التعبئة قبل تعطل التنفيذ.`,
            source: "inventory.escalation.critical_stockouts",
            link: "/dashboard/products-inventory",
            resourceType: "inventory_level",
            metadata: {
                critical_stockouts: criticalStockouts.length,
                fulfillment_queue: params.fulfillmentStats.fulfillmentQueue,
                low_stock: params.stats?.lowStock ?? 0,
                out_of_stock: params.stats?.outOfStock ?? 0,
            },
        });
        return;
    }

    const restockPressureTriggered =
        (rules.inventory.restockPressureItemsMin > 0 && highPressureRestocks.length >= rules.inventory.restockPressureItemsMin) ||
        (rules.inventory.lowStockTotalMin > 0 && (params.stats?.lowStock ?? 0) >= rules.inventory.lowStockTotalMin);

    if (restockPressureTriggered) {
        await reportAdminOperationalAlert({
            dispatchKey: "inventory:restock_pressure",
            bucketMs: 60 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "ضغط مرتفع على طابور إعادة التعبئة",
            message: `قائمة التعبئة تحتوي على ${highPressureRestocks.length} عناصر عالية الضغط و ${params.stats?.lowStock ?? 0} عناصر منخفضة المخزون.`,
            source: "inventory.escalation.restock_pressure",
            link: "/dashboard/products-inventory",
            resourceType: "inventory_level",
            metadata: {
                high_pressure_restock: highPressureRestocks.length,
                low_stock: params.stats?.lowStock ?? 0,
                out_of_stock: params.stats?.outOfStock ?? 0,
                fulfillment_queue: params.fulfillmentStats.fulfillmentQueue,
            },
        });
    }
}

export async function emitOrderRevenueEscalations(params: {
    finance?: {
        pendingPayments: number;
        failedPayments: number;
        outstandingRevenue: number;
        atRiskRevenue: number;
        activeRevenueQueue: number;
    };
    operations?: {
        pendingReview: number;
        fulfillmentQueue: number;
        paymentPending: number;
        todayOrders: number;
    };
}) {
    if (!shouldEmitLiveOperationalEscalations()) return;
    const rules = await getOperationalRules();

    const finance = params.finance;
    const operations = params.operations;

    if (finance) {
        const failedPaymentsTriggered =
            (rules.payments.failedPaymentsWarningMin > 0 && finance.failedPayments >= rules.payments.failedPaymentsWarningMin) ||
            (rules.payments.atRiskRevenueWarning > 0 && finance.atRiskRevenue >= rules.payments.atRiskRevenueWarning);

        if (failedPaymentsTriggered) {
            const failedPaymentsCritical =
                (rules.payments.failedPaymentsCriticalMin > 0 && finance.failedPayments >= rules.payments.failedPaymentsCriticalMin) ||
                (rules.payments.atRiskRevenueCritical > 0 && finance.atRiskRevenue >= rules.payments.atRiskRevenueCritical);

            await reportAdminOperationalAlert({
                dispatchKey: "payments:failed_or_at_risk",
                bucketMs: 30 * 60 * 1000,
                category: "payments",
                severity: failedPaymentsCritical ? "critical" : "warning",
                title:
                    failedPaymentsCritical
                        ? "تعثر مدفوعات يهدد الإيراد"
                        : "تعثر مدفوعات يحتاج متابعة",
                message: `يوجد ${finance.failedPayments} مدفوعات متعثرة بإيراد معرض للخطر قدره ${Math.round(finance.atRiskRevenue)} ر.س.`,
                source: "orders.escalation.failed_payments",
                link: "/dashboard/analytics",
                resourceType: "order",
                metadata: {
                    failed_payments: finance.failedPayments,
                    at_risk_revenue: finance.atRiskRevenue,
                    active_revenue_queue: finance.activeRevenueQueue,
                },
            });
        }

        const pendingPaymentsTriggered =
            (rules.payments.pendingPaymentsWarningMin > 0 && finance.pendingPayments >= rules.payments.pendingPaymentsWarningMin) ||
            (rules.payments.outstandingRevenueWarning > 0 && finance.outstandingRevenue >= rules.payments.outstandingRevenueWarning);

        if (pendingPaymentsTriggered) {
            const pendingPaymentsCritical =
                (rules.payments.pendingPaymentsCriticalMin > 0 && finance.pendingPayments >= rules.payments.pendingPaymentsCriticalMin) ||
                (rules.payments.outstandingRevenueCritical > 0 && finance.outstandingRevenue >= rules.payments.outstandingRevenueCritical);

            await reportAdminOperationalAlert({
                dispatchKey: "payments:pending_collection",
                bucketMs: 45 * 60 * 1000,
                category: "payments",
                severity: pendingPaymentsCritical ? "critical" : "warning",
                title:
                    pendingPaymentsCritical
                        ? "تحصيلات معلقة بضغط مرتفع"
                        : "طابور تحصيل يحتاج تسريع",
                message: `يوجد ${finance.pendingPayments} طلبات بانتظار الدفع بقيمة معلقة تقارب ${Math.round(finance.outstandingRevenue)} ر.س.`,
                source: "orders.escalation.pending_payments",
                link: "/dashboard/analytics",
                resourceType: "order",
                metadata: {
                    pending_payments: finance.pendingPayments,
                    outstanding_revenue: finance.outstandingRevenue,
                    active_revenue_queue: finance.activeRevenueQueue,
                },
            });
        }
    }

    const operationsTriggered = operations && (
        (rules.orders.pendingReviewWarningMin > 0 && operations.pendingReview >= rules.orders.pendingReviewWarningMin) ||
        (rules.orders.fulfillmentQueueWarningMin > 0 && operations.fulfillmentQueue >= rules.orders.fulfillmentQueueWarningMin) ||
        (rules.orders.paymentPendingWarningMin > 0 && operations.paymentPending >= rules.orders.paymentPendingWarningMin)
    );

    if (operations && operationsTriggered) {
        const operationsCritical =
            (rules.orders.pendingReviewCriticalMin > 0 && operations.pendingReview >= rules.orders.pendingReviewCriticalMin) ||
            (rules.orders.fulfillmentQueueCriticalMin > 0 && operations.fulfillmentQueue >= rules.orders.fulfillmentQueueCriticalMin) ||
            (rules.orders.paymentPendingCriticalMin > 0 && operations.paymentPending >= rules.orders.paymentPendingCriticalMin);

        await reportAdminOperationalAlert({
            dispatchKey: "orders:backlog_pressure",
            bucketMs: 45 * 60 * 1000,
            category: "orders",
            severity: operationsCritical ? "critical" : "warning",
            title:
                operationsCritical
                    ? "ضغط مرتفع على خط الطلبات"
                    : "اختناق يتصاعد في طابور الطلبات",
            message: `بانتظار القرار ${operations.pendingReview} طلبات، وفي خط التنفيذ ${operations.fulfillmentQueue}، وبانتظار الدفع ${operations.paymentPending}.`,
            source: "orders.escalation.backlog",
            link: "/dashboard/orders",
            resourceType: "order",
            metadata: {
                pending_review: operations.pendingReview,
                fulfillment_queue: operations.fulfillmentQueue,
                payment_pending: operations.paymentPending,
                today_orders: operations.todayOrders,
            },
        });
    }
}
