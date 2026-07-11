// مساعدات التنسيق والحساب لنظام البوث

import { SIZES, StockMap, ThresholdMap, BoothProduct, DiscountResult, BoothDiscount } from "./types";

export const R = (n: number) => Math.round(n);
export const fmt = (n: number) => R(n).toLocaleString("ar-SA");
export const pct = (a: number, b: number) => (b ? R((a / b) * 100) : 0);

/** أيام ونصوص للتاريخ العربي */
export const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function nowT(): string {
    const d = new Date();
    const mm = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
    return `${d.getHours()}:${mm} ${d.getHours() < 12 ? "ص" : "م"}`;
}

/** إجمالي القطع لمنتج عبر كل المقاسات */
export function totalStock(pid: number, stock: StockMap): number {
    return SIZES.reduce((s, sz) => s + ((stock[pid] && stock[pid][sz]) || 0), 0);
}

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(pid: number, stock: StockMap, thresholds: ThresholdMap): StockLevel {
    const tot = totalStock(pid, stock);
    const thr = thresholds[pid] || 5;
    if (tot === 0) return "out";
    if (tot <= thr) return "low";
    return "ok";
}

/** تطبيق كوبون خصم على سعر */
export function applyDiscount(
    price: number,
    discId: string | number | undefined | null,
    discounts: BoothDiscount[],
): DiscountResult {
    const d = discounts.find((x) => String(x.id) === String(discId));
    if (!d) return { final: price, amt: 0, label: "" };
    if (d.min && price < d.min) {
        return { final: price, amt: 0, label: `الحد الأدنى ${d.min} ر للتفعيل` };
    }
    const amt = d.type === "pct" ? R((price * d.val) / 100) : Math.min(d.val, price);
    return { final: price - amt, amt, label: `${d.code}: - ${fmt(amt)} ر` };
}

/** ربح المنتج ونسبته */
export function productMargin(p: BoothProduct): number {
    return pct(p.price - p.cost, p.price);
}
