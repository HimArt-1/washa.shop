import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface OperationalRulesConfig {
    support: {
        slaAtRiskMin: number;
        slaBreachedMin: number;
    };
    inventory: {
        criticalStockoutsMin: number;
        restockPressureItemsMin: number;
        lowStockTotalMin: number;
        fulfillmentQueueCriticalMin: number;
    };
    payments: {
        failedPaymentsWarningMin: number;
        failedPaymentsCriticalMin: number;
        atRiskRevenueWarning: number;
        atRiskRevenueCritical: number;
        pendingPaymentsWarningMin: number;
        pendingPaymentsCriticalMin: number;
        outstandingRevenueWarning: number;
        outstandingRevenueCritical: number;
    };
    orders: {
        pendingReviewWarningMin: number;
        pendingReviewCriticalMin: number;
        fulfillmentQueueWarningMin: number;
        fulfillmentQueueCriticalMin: number;
        paymentPendingWarningMin: number;
        paymentPendingCriticalMin: number;
    };
}

export const DEFAULT_OPERATIONAL_RULES: OperationalRulesConfig = {
    support: {
        slaAtRiskMin: 1,
        slaBreachedMin: 1,
    },
    inventory: {
        criticalStockoutsMin: 1,
        restockPressureItemsMin: 4,
        lowStockTotalMin: 8,
        fulfillmentQueueCriticalMin: 1,
    },
    payments: {
        failedPaymentsWarningMin: 3,
        failedPaymentsCriticalMin: 5,
        atRiskRevenueWarning: 2500,
        atRiskRevenueCritical: 5000,
        pendingPaymentsWarningMin: 5,
        pendingPaymentsCriticalMin: 10,
        outstandingRevenueWarning: 4000,
        outstandingRevenueCritical: 9000,
    },
    orders: {
        pendingReviewWarningMin: 8,
        pendingReviewCriticalMin: 15,
        fulfillmentQueueWarningMin: 12,
        fulfillmentQueueCriticalMin: 20,
        paymentPendingWarningMin: 8,
        paymentPendingCriticalMin: 12,
    },
};

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return null;
    }

    return createClient<Database>(url, serviceKey, {
        auth: { persistSession: false },
    });
}

function coerceThreshold(value: unknown, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.round(parsed));
}

export function normalizeOperationalRules(value?: Record<string, unknown> | null): OperationalRulesConfig {
    const raw = value ?? {};
    const support = (raw.support as Record<string, unknown> | undefined) ?? {};
    const inventory = (raw.inventory as Record<string, unknown> | undefined) ?? {};
    const payments = (raw.payments as Record<string, unknown> | undefined) ?? {};
    const orders = (raw.orders as Record<string, unknown> | undefined) ?? {};

    return {
        support: {
            slaAtRiskMin: coerceThreshold(support.slaAtRiskMin, DEFAULT_OPERATIONAL_RULES.support.slaAtRiskMin),
            slaBreachedMin: coerceThreshold(support.slaBreachedMin, DEFAULT_OPERATIONAL_RULES.support.slaBreachedMin),
        },
        inventory: {
            criticalStockoutsMin: coerceThreshold(inventory.criticalStockoutsMin, DEFAULT_OPERATIONAL_RULES.inventory.criticalStockoutsMin),
            restockPressureItemsMin: coerceThreshold(inventory.restockPressureItemsMin, DEFAULT_OPERATIONAL_RULES.inventory.restockPressureItemsMin),
            lowStockTotalMin: coerceThreshold(inventory.lowStockTotalMin, DEFAULT_OPERATIONAL_RULES.inventory.lowStockTotalMin),
            fulfillmentQueueCriticalMin: coerceThreshold(inventory.fulfillmentQueueCriticalMin, DEFAULT_OPERATIONAL_RULES.inventory.fulfillmentQueueCriticalMin),
        },
        payments: {
            failedPaymentsWarningMin: coerceThreshold(payments.failedPaymentsWarningMin, DEFAULT_OPERATIONAL_RULES.payments.failedPaymentsWarningMin),
            failedPaymentsCriticalMin: coerceThreshold(payments.failedPaymentsCriticalMin, DEFAULT_OPERATIONAL_RULES.payments.failedPaymentsCriticalMin),
            atRiskRevenueWarning: coerceThreshold(payments.atRiskRevenueWarning, DEFAULT_OPERATIONAL_RULES.payments.atRiskRevenueWarning),
            atRiskRevenueCritical: coerceThreshold(payments.atRiskRevenueCritical, DEFAULT_OPERATIONAL_RULES.payments.atRiskRevenueCritical),
            pendingPaymentsWarningMin: coerceThreshold(payments.pendingPaymentsWarningMin, DEFAULT_OPERATIONAL_RULES.payments.pendingPaymentsWarningMin),
            pendingPaymentsCriticalMin: coerceThreshold(payments.pendingPaymentsCriticalMin, DEFAULT_OPERATIONAL_RULES.payments.pendingPaymentsCriticalMin),
            outstandingRevenueWarning: coerceThreshold(payments.outstandingRevenueWarning, DEFAULT_OPERATIONAL_RULES.payments.outstandingRevenueWarning),
            outstandingRevenueCritical: coerceThreshold(payments.outstandingRevenueCritical, DEFAULT_OPERATIONAL_RULES.payments.outstandingRevenueCritical),
        },
        orders: {
            pendingReviewWarningMin: coerceThreshold(orders.pendingReviewWarningMin, DEFAULT_OPERATIONAL_RULES.orders.pendingReviewWarningMin),
            pendingReviewCriticalMin: coerceThreshold(orders.pendingReviewCriticalMin, DEFAULT_OPERATIONAL_RULES.orders.pendingReviewCriticalMin),
            fulfillmentQueueWarningMin: coerceThreshold(orders.fulfillmentQueueWarningMin, DEFAULT_OPERATIONAL_RULES.orders.fulfillmentQueueWarningMin),
            fulfillmentQueueCriticalMin: coerceThreshold(orders.fulfillmentQueueCriticalMin, DEFAULT_OPERATIONAL_RULES.orders.fulfillmentQueueCriticalMin),
            paymentPendingWarningMin: coerceThreshold(orders.paymentPendingWarningMin, DEFAULT_OPERATIONAL_RULES.orders.paymentPendingWarningMin),
            paymentPendingCriticalMin: coerceThreshold(orders.paymentPendingCriticalMin, DEFAULT_OPERATIONAL_RULES.orders.paymentPendingCriticalMin),
        },
    };
}

export async function getOperationalRules(): Promise<OperationalRulesConfig> {
    const supabase = getAdminSupabase();
    if (!supabase) {
        return DEFAULT_OPERATIONAL_RULES;
    }

    try {
        const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "operational_rules")
            .maybeSingle();

        return normalizeOperationalRules((data?.value as Record<string, unknown> | undefined) ?? null);
    } catch {
        return DEFAULT_OPERATIONAL_RULES;
    }
}
