// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — صلاحية الوصول لـ "تصميم قطعة"
//  لا يمكن الدخول إلا بعد تسجيل اشتراك وقبول من الإدارة
//  الأدمن والوشّاي: مسموح دائماً | الباقي: يحتاج طلب مقبول
// ═══════════════════════════════════════════════════════════

"use server";

import { resolveDesignPieceAccess } from "@/lib/design-piece-access";

/**
 * صلاحية التصميم:
 * - المشرف والوشّاي والمشترك: مسموح دائماً
 * - غير مسجّل الدخول: يُحوّل لتسجيل الدخول
 * - بدون ملف شخصي: يُطلب منه التسجيل
 */
export async function canAccessDesignPiece(): Promise<{
    allowed: boolean;
    reason?: "not_signed_in" | "guest_needs_approval" | "approved";
}> {
    return resolveDesignPieceAccess();
}
