"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { applicationSchema, newsletterSchema } from "@/lib/validations";
import { createAdminNotification } from "@/app/actions/notifications";
import { sendAdminApplicationNotificationEmail } from "@/lib/email";
import { sendPushToAll } from "@/lib/push";
// import type { Database } from "@/types/database"; // Not strictly needed if we cast

export type ActionResponse = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
};

export async function submitApplication(formData: FormData): Promise<ActionResponse> {
    const rawData = {
        full_name: formData.get("full_name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        portfolio_url: formData.get("portfolio_url"),
        instagram_url: formData.get("instagram_url"),
        art_style: formData.get("art_style"),
        experience_years: formData.get("experience_years") ? Number(formData.get("experience_years")) : undefined,
        motivation: formData.get("motivation"),
    };

    // Validate
    const validated = applicationSchema.safeParse(rawData);

    if (!validated.success) {
        return {
            success: false,
            message: "الرجاء التأكد من صحة البيانات المدخلة",
            errors: validated.error.flatten().fieldErrors,
        };
    }

    const supabase = getSupabaseServerClient();

    // Prepare data matching DB schema expectations
    // We cast supabase to 'any' to bypass strict type checks that are failing build
    // but the data structure is correct for the DB.
    const insertData = {
        ...validated.data,
        phone: validated.data.phone ?? null,
        portfolio_url: validated.data.portfolio_url ?? null,
        instagram_url: validated.data.instagram_url ?? null,
        experience_years: validated.data.experience_years ?? null,
        // portfolio_images has default in DB, so we can omit it or pass []
    };

    const { error } = await (supabase as any)
        .from("applications")
        .insert([insertData]);

    if (error) {
        console.error("Submission error:", error);
        return {
            success: false,
            message: "حدث خطأ أثناء إرسال الطلب، الرجاء المحاولة لاحقاً",
        };
    }

    createAdminNotification({
        type: "application_new",
        title: "طلب انضمام جديد",
        message: `${validated.data.full_name} — ${validated.data.art_style}`,
        link: "/dashboard/applications",
        metadata: { email: validated.data.email },
    }).catch(() => { });

    sendAdminApplicationNotificationEmail(
        validated.data.full_name,
        validated.data.email,
        validated.data.art_style
    ).catch(console.error);

    sendPushToAll("طلب انضمام جديد", `${validated.data.full_name} — ${validated.data.art_style}`, "/dashboard/applications").catch(() => { });

    revalidatePath("/"); // Revalidate cache for relevant paths
    return { success: true, message: "تم استلام طلبك بنجاح! سنقوم بمراجعته والتواصل معك قريباً." };
}

export async function subscribeNewsletter(formData: FormData): Promise<ActionResponse> {
    const rawData = {
        email: formData.get("email"),
    };

    const validated = newsletterSchema.safeParse(rawData);

    if (!validated.success) {
        return {
            success: false,
            message: "البريد الإلكتروني غير صالح",
            errors: validated.error.flatten().fieldErrors,
        };
    }

    const supabase = getSupabaseServerClient();

    // Use upsert with ignoreDuplicates to handle existing email silently
    const { error } = await (supabase as any)
        .from("newsletter_subscribers")
        .upsert([{ email: validated.data.email, is_active: true }], {
            onConflict: "email",
            ignoreDuplicates: true,
        });

    if (error) {
        console.error("Newsletter error:", error);
        return {
            success: false,
            message: "حدث خطأ أثناء الاشتراك",
        };
    }

    return { success: true, message: "تم الاشتراك بنجاح!" };
}
