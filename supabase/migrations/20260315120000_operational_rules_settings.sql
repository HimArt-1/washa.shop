-- Seed configurable operational escalation rules in site settings.

INSERT INTO public.site_settings (key, value)
VALUES (
    'operational_rules',
    '{
      "support": {
        "slaAtRiskMin": 1,
        "slaBreachedMin": 1
      },
      "inventory": {
        "criticalStockoutsMin": 1,
        "restockPressureItemsMin": 4,
        "lowStockTotalMin": 8,
        "fulfillmentQueueCriticalMin": 1
      },
      "payments": {
        "failedPaymentsWarningMin": 3,
        "failedPaymentsCriticalMin": 5,
        "atRiskRevenueWarning": 2500,
        "atRiskRevenueCritical": 5000,
        "pendingPaymentsWarningMin": 5,
        "pendingPaymentsCriticalMin": 10,
        "outstandingRevenueWarning": 4000,
        "outstandingRevenueCritical": 9000
      },
      "orders": {
        "pendingReviewWarningMin": 8,
        "pendingReviewCriticalMin": 15,
        "fulfillmentQueueWarningMin": 12,
        "fulfillmentQueueCriticalMin": 20,
        "paymentPendingWarningMin": 8,
        "paymentPendingCriticalMin": 12
      }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
