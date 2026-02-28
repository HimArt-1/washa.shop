// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Join Form Action
//  حفظ بيانات المنضمين الجدد
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import { createAdminNotification } from "@/app/actions/notifications";

function getClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

interface JoinFormData {
    name: string;
    email: string;
    phone: string;
    clothing: string[];
}

export async function submitJoinForm(data: JoinFormData) {
    try {
        if (!data.name.trim() || !data.email.trim()) {
            return { success: false, message: "الاسم والبريد الإلكتروني مطلوبان" };
        }

        // Simple email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            return { success: false, message: "البريد الإلكتروني غير صالح" };
        }

        const supabase = getClient();

        const { error } = await supabase
            .from("applications")
            .insert([{
                full_name: data.name.trim(),
                email: data.email.trim().toLowerCase(),
                phone: data.phone.trim() || null,
                art_style: data.clothing.length > 0
                    ? data.clothing.join(", ")
                    : "لم يحدد",
                motivation: "انضمام عبر الموقع",
                status: "pending",
            }]);

        if (error) {
            console.error("[Join] Insert error:", error.message);
            return { success: false, message: "حدث خطأ، حاول مرة أخرى" };
        }

        createAdminNotification({
            type: "application_new",
            title: "طلب انضمام جديد",
            message: `${data.name} — ${data.email}`,
            link: "/dashboard/applications",
        }).catch(() => {});

        return { success: true, message: "تم التسجيل بنجاح!" };
    } catch (error) {
        console.error("[Join] Fatal error:", error);
        return { success: false, message: "حدث خطأ غير متوقع" };
    }
}
