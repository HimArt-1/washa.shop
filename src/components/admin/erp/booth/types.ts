// نظام البوث — نماذج البيانات (المرحلة 1: حالة client في الذاكرة)
// تُعاد لاحقاً على Supabase في المرحلة 2.

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export type PayMethod = "نقد" | "بطاقة" | "تحويل بنكي" | "هدية";
export type OrderStatus = "جديد" | "قيد التنفيذ" | "مكتمل" | "مرتجع";
export type DiscountType = "pct" | "fixed";
export type ExpensePeriod = "اليوم" | "الأسبوع" | "الشهر";

export interface BoothProduct {
    id: number;
    name: string;
    price: number;
    cost: number;
}

/** المخزون: pid -> size -> quantity */
export type StockMap = Record<number, Record<string, number>>;

/** حد التنبيه لكل منتج */
export type ThresholdMap = Record<number, number>;

export interface BoothOrder {
    id: number;
    name: string;
    product: string;
    pid: number | null;
    size: string;
    qty: number;
    amount: number;
    baseAmount: number;
    discAmt: number;
    cogs: number;
    profit: number;
    pay: PayMethod | string;
    status: OrderStatus | string;
    prepaid: boolean;
    paid: boolean;
    time: string;
    note: string;
}

export interface BoothSale {
    id: number;
    source: "طلب" | "كاشير";
    detail: string;
    pay: PayMethod | string;
    amount: number;
    cogs: number;
    time: string;
}

export interface BoothReturn {
    id: number;
    orderId: number;
    customer: string;
    amount: number;
    reason: string;
    refund: string;
    note: string;
    restocked: boolean;
    time: string;
}

export interface BoothExpense {
    id: number;
    name: string;
    amount: number;
    cat: string;
    period: ExpensePeriod | string;
    time: string;
}

export interface BoothDiscount {
    id: number;
    code: string;
    type: DiscountType;
    val: number;
    min: number;
}

/** نتيجة تطبيق خصم على مبلغ */
export interface DiscountResult {
    final: number;
    amt: number;
    label: string;
}

export type BoothTabId =
    | "dash"
    | "products"
    | "stock"
    | "orders"
    | "new-order"
    | "cashier"
    | "discounts"
    | "returns"
    | "finance"
    | "eod";
