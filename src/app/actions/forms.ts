"use server";

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { applicationSchema, newsletterSchema } from "@/lib/validations";
import { createAdminNotification } from "@/app/actions/notifications";
import { sendAdminApplicationNotificationEmail } from "@/lib/email";
import { sendPushToAdmins } from "@/lib/push";
import type { Application } from "@/types/database";

export type ActionResponse = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
};

const JOIN_CLOTHING_LABELS: Record<string, string> = {
    thobe_shimagh: "ثوب وشماغ",
    tshirt: "تيشيرت",
    hoodie: "هودي",
    plain_thobe: "ثوب سادة",
    abaya_shayla: "عباية وشيلة",
    blouse_skirt: "بلوزة وتنورة",
    dress: "فستان",
    plain_abaya: "عباية سادة",
};

const JOIN_TYPE_LABELS: Record<string, string> = {
    artist: "فنان",
    designer: "مصمم",
    model: "مودل",
    customer: "عميل مهتم",
    partner: "شريك أو متعاون",
};

type ApplicationInsertPayload = {
    full_name: string;
    email: string;
    phone?: string | null;
    join_type?: "artist" | "designer" | "model" | "customer" | "partner" | null;
    gender?: "male" | "female" | null;
    birth_date?: string | null;
    portfolio_url?: string | null;
    instagram_url?: string | null;
    art_style: string;
    experience_years?: number | null;
    motivation: string;
};

async function getCurrentMatchingProfileId(email: string) {
    const user = await currentUser();
    if (!user) return null;

    const normalizedEmail = email.trim().toLowerCase();
    const userEmails = new Set(
        user.emailAddresses
            .map((item) => item.emailAddress.trim().toLowerCase())
            .filter(Boolean)
    );

    if (!userEmails.has(normalizedEmail)) {
        return null;
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    return profile?.id ?? null;
}

async function submitApplicationRecord(data: ApplicationInsertPayload): Promise<ActionResponse> {
    const supabase = getSupabaseAdminClient();
    const normalizedEmail = data.email.trim().toLowerCase();

    const { data: existing } = await supabase
        .from("applications")
        .select("status")
        .eq("email", normalizedEmail)
        .in("status", ["pending", "reviewing", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing?.status === "accepted") {
        return {
            success: true,
            message: "لديك طلب مقبول بالفعل، وسنتواصل معك عبر البريد الإلكتروني المسجل عند الحاجة.",
        };
    }

    if (existing?.status === "pending" || existing?.status === "reviewing") {
        return {
            success: true,
            message: "تم استلام طلبك مسبقاً وهو قيد المراجعة حالياً.",
        };
    }

    const profileId = await getCurrentMatchingProfileId(normalizedEmail);
    const insertData: {
        full_name: string;
        email: string;
        phone: string | null;
        join_type: "artist" | "designer" | "model" | "customer" | "partner" | null;
        gender: "male" | "female" | null;
        birth_date: string | null;
        portfolio_url: string | null;
        instagram_url: string | null;
        art_style: string;
        experience_years: number | null;
        motivation: string;
        profile_id: string | null;
    } = {
        full_name: data.full_name,
        email: normalizedEmail,
        phone: data.phone ?? null,
        join_type: data.join_type ?? null,
        gender: data.gender ?? null,
        birth_date: data.birth_date ?? null,
        portfolio_url: data.portfolio_url ?? null,
        instagram_url: data.instagram_url ?? null,
        art_style: data.art_style,
        experience_years: data.experience_years ?? null,
        motivation: data.motivation,
        profile_id: profileId ?? null,
    };

    const { error } = await supabase
        .from("applications")
        .insert([insertData satisfies Omit<Application, "id" | "created_at" | "updated_at" | "status" | "reviewer_id" | "reviewer_notes" | "portfolio_images">]);

    if (error) {
        console.error("Submission error:", error);
        return {
            success: false,
            message: "حدث خطأ أثناء إرسال الطلب، الرجاء المحاولة لاحقاً",
        };
    }

    createAdminNotification({
        type: "application_new",
        category: "applications",
        severity: "info",
        title: "طلب انضمام جديد",
        message: `${data.full_name} — ${data.art_style}`,
        link: "/dashboard/applications",
        metadata: { email: normalizedEmail },
    }).catch(() => {});

    sendAdminApplicationNotificationEmail(
        data.full_name,
        normalizedEmail,
        data.art_style
    ).catch(console.error);

    sendPushToAdmins("طلب انضمام جديد", `${data.full_name} — ${data.art_style}`, "/dashboard/applications").catch(() => {});

    revalidatePath("/");
    return { success: true, message: "تم استلام طلبك بنجاح! سنقوم بمراجعته والتواصل معك قريباً." };
}

export async function submitApplication(formData: FormData): Promise<ActionResponse> {
    const rawData = {
        full_name: formData.get("full_name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        join_type: formData.get("join_type"),
        gender: formData.get("gender"),
        birth_date: formData.get("birth_date"),
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

    return submitApplicationRecord({
        ...validated.data,
        email: validated.data.email.trim().toLowerCase(),
        phone: validated.data.phone ?? null,
        portfolio_url: validated.data.portfolio_url ?? null,
        instagram_url: validated.data.instagram_url ?? null,
        experience_years: validated.data.experience_years ?? null,
    });
}

export async function submitJoinLead(data: {
    name: string;
    email: string;
    phone: string;
    joinType: "artist" | "designer" | "model" | "customer" | "partner" | "";
    gender: "male" | "female" | "";
    birthDate: string;
    clothing: string[];
}): Promise<ActionResponse> {
    if (!(data.joinType in JOIN_TYPE_LABELS)) {
        return {
            success: false,
            message: "الرجاء تحديد نوع الانضمام قبل الإرسال",
        };
    }

    if (data.gender !== "male" && data.gender !== "female") {
        return {
            success: false,
            message: "الرجاء تحديد الجنس قبل الإرسال",
        };
    }

    const mappedClothing = (data.clothing || [])
        .map((item) => JOIN_CLOTHING_LABELS[item] || item)
        .filter(Boolean);

    const joinTypeLabel = JOIN_TYPE_LABELS[data.joinType];
    const genderLabel = data.gender === "male" ? "ذكر" : "أنثى";
    const artStyle = mappedClothing.length > 0 ? mappedClothing.join(", ") : "اهتمامات عامة بالمنصة";
    const birthDateText = data.birthDate ? ` تاريخ الميلاد: ${data.birthDate}.` : "";
    const motivation = `طلب انضمام مبسط عبر صفحة الانضمام. نوع الانضمام: ${joinTypeLabel}. الجنس: ${genderLabel}.${birthDateText} الاهتمامات: ${artStyle}.`;

    const validated = applicationSchema.safeParse({
        full_name: data.name,
        email: data.email,
        phone: data.phone || "",
        join_type: data.joinType,
        gender: data.gender,
        birth_date: data.birthDate || "",
        portfolio_url: "",
        instagram_url: "",
        art_style: artStyle,
        motivation,
    });

    if (!validated.success) {
        return {
            success: false,
            message: "الرجاء التأكد من صحة البيانات المدخلة",
            errors: validated.error.flatten().fieldErrors,
        };
    }

    return submitApplicationRecord({
        ...validated.data,
        email: validated.data.email.trim().toLowerCase(),
        phone: validated.data.phone ?? null,
        join_type: validated.data.join_type ?? null,
        gender: validated.data.gender ?? null,
        birth_date: validated.data.birth_date || null,
        portfolio_url: null,
        instagram_url: null,
        experience_years: null,
    });
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

    const supabase = getSupabaseAdminClient();
    const email = validated.data.email.trim().toLowerCase();

    const { data: existing, error: existingError } = await supabase
        .from("newsletter_subscribers")
        .select("id, is_active")
        .eq("email", email)
        .maybeSingle();

    if (existingError) {
        console.error("Newsletter lookup error:", existingError);
        return {
            success: false,
            message: "حدث خطأ أثناء الاشتراك",
        };
    }

    if (existing?.is_active) {
        return { success: true, message: "أنت مشترك بالفعل!" };
    }

    const operation = existing?.id
        ? supabase
              .from("newsletter_subscribers")
              .update({ is_active: true })
              .eq("id", existing.id)
        : supabase
              .from("newsletter_subscribers")
              .insert([{ email, is_active: true }]);

    const { error } = await operation;
    if (error) {
        console.error("Newsletter error:", error);
        return {
            success: false,
            message: "حدث خطأ أثناء الاشتراك",
        };
    }

    return { success: true, message: "تم الاشتراك بنجاح!" };
}
