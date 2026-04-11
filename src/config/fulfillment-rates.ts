/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — Warehouse Fulfillment Rates
 *  أسعار الاستحقاق للمستودع (الخامات والطباعة)
 * ═══════════════════════════════════════════════════════════
 */

export const FULFILLMENT_RATES = {
    // أسعار الخامات الأساسية (Base Garment Prices)
    garments: {
        "oversize-tshirt": 35.0, // تيشرت أوفرسايز
        "premium-tshirt": 30.0,  // تيشرت بريميوم
        "hoodie": 55.0,         // هودي
        "sweatshirt": 50.0,     // سويت شيرت
        "cap": 15.0,            // كاب
    },

    // أسعار الطباعة حسب المساحة (Printing Fees)
    printing: {
        chest_large: 20.0,     // طباعة صدر كبيرة
        chest_small: 12.0,     // طباعة صدر صغيرة
        back_large: 25.0,      // طباعة ظهر كبيرة
        back_small: 15.0,      // طباعة ظهر صغيرة
        shoulder_large: 15.0,  // طباعة كتف كبيرة
        shoulder_small: 10.0,  // طباعة كتف صغيرة
    },

    // رسوم إضافية (Handling Fees)
    handling_per_order: 5.0,   // رسوم تجهيز لكل طلب
    packaging_unit: 2.0,       // رسوم تغليف لكل قطعة
};

/**
 * دالة مساعدة لحساب تكلفة قطعة واحدة بناءً على الخيارات
 */
export function calculateUnitFulfillmentCost(garmentSlug: string, positions: string[]) {
    const base = FULFILLMENT_RATES.garments[garmentSlug as keyof typeof FULFILLMENT_RATES.garments] || 30.0;
    
    let printTotal = 0;
    positions.forEach(pos => {
        const rate = FULFILLMENT_RATES.printing[pos as keyof typeof FULFILLMENT_RATES.printing] || 0;
        printTotal += rate;
    });

    return base + printTotal + FULFILLMENT_RATES.packaging_unit;
}
