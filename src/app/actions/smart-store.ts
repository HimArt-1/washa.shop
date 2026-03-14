"use server";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — المتجر الذكي Server Actions
//  CRUD operations for custom design garments, colors, etc.
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminNotification } from "./notifications";
import { createUserNotification } from "./user-notifications";
import type {
    Database,
    CustomDesignGarment,
    CustomDesignColor,
    CustomDesignSize,
    CustomDesignStyle,
    CustomDesignArtStyle,
    CustomDesignColorPackage,
    CustomDesignStudioItem,
    GarmentStudioMockup,
} from "@/types/database";
import { sendAdminDesignOrderNotificationEmail } from "@/lib/email";


function getSmartStoreSb() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient<Database>(url, key, { auth: { persistSession: false } });
}

// ─── Public Reads ────────────────────────────────────────

export async function getActiveGarments(): Promise<CustomDesignGarment[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_garments")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignGarment[]) ?? [];
}

export async function getGarmentColors(garmentId: string): Promise<CustomDesignColor[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_colors")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignColor[]) ?? [];
}

export async function getColorSizes(garmentId: string, colorId?: string): Promise<CustomDesignSize[]> {
    const sb = getSmartStoreSb();
    let query = sb
        .from("custom_design_sizes")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("is_active", true);
    if (colorId) query = query.eq("color_id", colorId);
    const { data } = await query.order("name");
    return (data as CustomDesignSize[]) ?? [];
}

export async function getDesignStyles(): Promise<CustomDesignStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_styles")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignStyle[]) ?? [];
}

export async function getArtStyles(): Promise<CustomDesignArtStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_art_styles")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignArtStyle[]) ?? [];
}

export async function getColorPackages(): Promise<CustomDesignColorPackage[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_color_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignColorPackage[]) ?? [];
}

export async function getStudioItems(): Promise<CustomDesignStudioItem[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_studio_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignStudioItem[]) ?? [];
}

// ─── Admin: Get All (including inactive) ─────────────────

export async function getAllGarments(): Promise<CustomDesignGarment[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_garments")
        .select("*")
        .order("sort_order");
    return (data as CustomDesignGarment[]) ?? [];
}

export async function getAllColors(garmentId?: string): Promise<CustomDesignColor[]> {
    const sb = getSmartStoreSb();
    let query = sb.from("custom_design_colors").select("*");
    if (garmentId) query = query.eq("garment_id", garmentId);
    const { data } = await query.order("sort_order");
    return (data as CustomDesignColor[]) ?? [];
}

export async function getAllSizes(garmentId?: string): Promise<CustomDesignSize[]> {
    const sb = getSmartStoreSb();
    let query = sb.from("custom_design_sizes").select("*");
    if (garmentId) query = query.eq("garment_id", garmentId);
    const { data } = await query.order("name");
    return (data as CustomDesignSize[]) ?? [];
}

export async function getAllStyles(): Promise<CustomDesignStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_styles").select("*").order("sort_order");
    return (data as CustomDesignStyle[]) ?? [];
}

export async function getAllArtStyles(): Promise<CustomDesignArtStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_art_styles").select("*").order("sort_order");
    return (data as CustomDesignArtStyle[]) ?? [];
}

export async function getAllColorPackages(): Promise<CustomDesignColorPackage[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_color_packages").select("*").order("sort_order");
    return (data as CustomDesignColorPackage[]) ?? [];
}

export async function getAllStudioItems(): Promise<CustomDesignStudioItem[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_studio_items").select("*").order("sort_order");
    return (data as CustomDesignStudioItem[]) ?? [];
}

// ─── Admin: Upsert ───────────────────────────────────────

export async function upsertGarment(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
        base_price: Number(formData.get("base_price") ?? 0),
        // Print Pricing
        price_chest_large: Number(formData.get("price_chest_large") ?? 0),
        price_chest_small: Number(formData.get("price_chest_small") ?? 0),
        price_back_large: Number(formData.get("price_back_large") ?? 0),
        price_back_small: Number(formData.get("price_back_small") ?? 0),
        price_shoulder_large: Number(formData.get("price_shoulder_large") ?? 0),
        price_shoulder_small: Number(formData.get("price_shoulder_small") ?? 0),
    };

    if (id) {
        const { error } = await sb.from("custom_design_garments").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_garments").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertColor(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        garment_id: formData.get("garment_id") as string,
        name: formData.get("name") as string,
        hex_code: formData.get("hex_code") as string,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_colors").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_colors").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertSize(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        garment_id: formData.get("garment_id") as string,
        color_id: (formData.get("color_id") as string) || null,
        name: formData.get("name") as string,
        image_front_url: (formData.get("image_front_url") as string) || null,
        image_back_url: (formData.get("image_back_url") as string) || null,
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_sizes").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_sizes").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertStyle(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_styles").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_styles").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertArtStyle(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_art_styles").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_art_styles").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertColorPackage(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const colorsRaw = formData.get("colors") as string;
    const payload = {
        name: formData.get("name") as string,
        colors: colorsRaw ? JSON.parse(colorsRaw) : [],
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_color_packages").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_color_packages").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertStudioItem(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        price: Number(formData.get("price") ?? 0),
        main_image_url: (formData.get("main_image_url") as string) || null,
        mockup_image_url: (formData.get("mockup_image_url") as string) || null,
        model_image_url: (formData.get("model_image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_studio_items").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_studio_items").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

// ─── Admin: Delete ───────────────────────────────────────

export async function deleteGarment(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_garments").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteColor(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_colors").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteSize(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_sizes").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteStyle(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_styles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteArtStyle(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_art_styles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteColorPackage(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_color_packages").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteStudioItem(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_studio_items").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Garment × Studio Mockups — موكبات التصاميم الجاهزة
// ═══════════════════════════════════════════════════════════

export async function getAllGarmentStudioMockups(): Promise<GarmentStudioMockup[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("garment_studio_mockups")
        .select("*")
        .order("sort_order");
    return (data as GarmentStudioMockup[]) ?? [];
}

export async function getStudioMockupForGarment(
    garmentId: string,
    studioItemId: string
): Promise<GarmentStudioMockup | null> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("garment_studio_mockups")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("studio_item_id", studioItemId)
        .single();
    return (data as GarmentStudioMockup) ?? null;
}

export async function upsertGarmentStudioMockup(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        garment_id: formData.get("garment_id") as string,
        studio_item_id: formData.get("studio_item_id") as string,
        mockup_front_url: (formData.get("mockup_front_url") as string) || null,
        mockup_back_url: (formData.get("mockup_back_url") as string) || null,
        mockup_model_url: (formData.get("mockup_model_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
    };

    if (id) {
        const { error } = await sb.from("garment_studio_mockups").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("garment_studio_mockups").insert(payload);
        if (error) {
            if (error.code === "23505") {
                return { error: "يوجد موكب مسبقاً لهذه القطعة مع هذا التصميم. عدّله بدلاً من إضافته." };
            }
            return { error: error.message };
        }
    }
    return { success: true };
}

export async function deleteGarmentStudioMockup(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("garment_studio_mockups").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Design Orders — طلبات التصميم
// ═══════════════════════════════════════════════════════════

import type { CustomDesignOrder, CustomDesignOrderStatus, CustomDesignSettings } from "@/types/database";

// ─── Get AI Prompt Template ─────────────────────────────

export async function getDesignPromptTemplate(): Promise<string> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_settings")
        .select("ai_prompt_template")
        .eq("id", "default")
        .single();
    const template = data?.ai_prompt_template;
    if (template && template.trim().length > 0) return template;

    // Default fallback template
    return `Create a professional design for a {{garment_name}} garment by WASHA (وشّى).

Garment: {{garment_name}}
Base Color: {{color_name}} ({{color_hex}})
Design Style: {{style_name}}
Art Style: {{art_style_name}}
Color Palette: {{colors}}

Customer Description:
{{user_prompt}}

Requirements:
- Maintain WASHA brand identity (luxury Arabic streetwear)
- High resolution, print-ready quality
- Clean design suitable for garment printing
- Incorporate the specified art style and color palette
- Arabic calligraphy or motifs where appropriate`;
}

export async function updateDesignPromptTemplate(template: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb
        .from("custom_design_settings")
        .update({ ai_prompt_template: template })
        .eq("id", "default");
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Generate AI Prompt from Template ───────────────────

function generateAiPrompt(template: string, data: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(data)) {
        prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "—");
    }
    return prompt;
}

// ─── Submit Design Order (Public) ───────────────────────

export async function submitDesignOrder(orderData: {
    garment_name: string;
    garment_image_url?: string;
    color_name: string;
    color_hex: string;
    color_image_url?: string;
    size_name: string;
    design_method: "from_text" | "from_image" | "studio";
    text_prompt?: string;
    reference_image_url?: string;
    style_name?: string;
    style_image_url?: string;
    art_style_name?: string;
    art_style_image_url?: string;
    color_package_name?: string;
    custom_colors?: any[];
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    print_position?: string;
    print_size?: string;
}) {
    const sb = getSmartStoreSb();

    // 1. Get prompt template
    const template = await getDesignPromptTemplate();

    // 2. Build colors string
    const colorsStr = orderData.color_package_name
        ? orderData.color_package_name
        : orderData.custom_colors && orderData.custom_colors.length > 0
            ? orderData.custom_colors.join(", ")
            : `${orderData.color_name} (${orderData.color_hex})`;

    // 3. User prompt or image note
    // If studio, handle separately
    let userPrompt = "—";
    if (orderData.design_method === "from_text") {
        userPrompt = orderData.text_prompt ?? "—";
    } else if (orderData.design_method === "from_image") {
        userPrompt = `[صورة مرجعية مرفقة: ${orderData.reference_image_url ?? "—"}]`;
    } else if (orderData.design_method as unknown === "studio") {
        userPrompt = `[تصميم من ستيديو وشّى: ${orderData.text_prompt ?? "—"}]`;
    }

    // Lookup authenticated user if they exist
    let userId: string | null = null;
    let finalCustomerName = orderData.customer_name;
    let finalCustomerEmail = orderData.customer_email;
    let finalCustomerPhone = orderData.customer_phone;

    const user = await currentUser();
    if (user) {
        const { data: profile } = await sb.from("profiles").select("id").eq("clerk_id", user.id).single();
        if (profile) userId = profile.id;

        if (!finalCustomerName) {
            finalCustomerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "عميل مسجل";
        }
        if (!finalCustomerEmail) {
            finalCustomerEmail = user.emailAddresses?.[0]?.emailAddress;
        }
        if (!finalCustomerPhone) {
            finalCustomerPhone = user.phoneNumbers?.[0]?.phoneNumber;
        }
    }

    // 4. Generate AI prompt
    const aiPrompt = generateAiPrompt(template, {
        garment_name: orderData.garment_name,
        color_name: orderData.color_name,
        color_hex: orderData.color_hex,
        style_name: orderData.style_name || "—",
        art_style_name: orderData.art_style_name || "—",
        colors: colorsStr,
        user_prompt: userPrompt,
    });

    // 5. Insert order
    const payload = {
        user_id: userId,
        garment_name: orderData.garment_name,
        garment_image_url: orderData.garment_image_url || null,
        color_name: orderData.color_name,
        color_hex: orderData.color_hex,
        color_image_url: orderData.color_image_url || null,
        size_name: orderData.size_name,
        design_method: orderData.design_method,
        text_prompt: orderData.text_prompt || null,
        reference_image_url: orderData.reference_image_url || null,
        style_name: orderData.style_name || "—",
        style_image_url: orderData.style_image_url || null,
        art_style_name: orderData.art_style_name || "—",
        art_style_image_url: orderData.art_style_image_url || null,
        color_package_name: orderData.color_package_name || null,
        custom_colors: orderData.custom_colors ?? [],
        ai_prompt: aiPrompt,
        customer_name: finalCustomerName || null,
        customer_email: finalCustomerEmail || null,
        customer_phone: finalCustomerPhone || null,
        print_position: orderData.print_position || null,
        print_size: orderData.print_size || null,
    };

    const { data, error } = await sb
        .from("custom_design_orders")
        .insert(payload)
        .select("id, order_number")
        .single();

    if (error || !data) return { error: error?.message || "فشل إنشاء الطلب" };

    // Notify all admins about the new design order via in-app notification
    await createAdminNotification({
        type: "order_alert",
        title: "طلب تصميم جديد 🎨",
        message: `طلب تصميم جديد #${data.order_number} — ${orderData.garment_name} (${orderData.color_name}) من ${finalCustomerName || "عميل"}`,
        link: "/dashboard/design-orders",
    });

    // Fire email notification asynchronously so it doesn't block the user
    sendAdminDesignOrderNotificationEmail(
        data.order_number,
        finalCustomerName || '',
        finalCustomerEmail || '',
        finalCustomerPhone || '',
        orderData.garment_name,
        orderData.color_name,
        orderData.design_method,
        data.id
    ).catch(err => console.error("Failed to send design order email async", err));

    return { success: true, orderId: data.id, orderNumber: data.order_number };
}

// ─── Admin: Get Design Orders ───────────────────────────

export async function getDesignOrders(page = 1, status: CustomDesignOrderStatus | "all" = "all") {
    const sb = getSmartStoreSb();
    const perPage = 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = sb.from("custom_design_orders").select("*", { count: "exact" });
    if (status !== "all") {
        query = query.eq("status", status);
    }
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) {
        console.error("getDesignOrders error:", error);
        return { data: [], count: 0, totalPages: 0 };
    }
    return {
        data: (data as CustomDesignOrder[]) ?? [],
        count: count ?? 0,
        totalPages: count ? Math.ceil(count / perPage) : 0,
    };
}

// ─── Admin: Get Single Order ────────────────────────────

export async function getDesignOrder(id: string): Promise<CustomDesignOrder | null> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_orders").select("*").eq("id", id).single();
    return (data as CustomDesignOrder) ?? null;
}

// ─── Admin: Update Status ───────────────────────────────

export async function updateDesignOrderStatus(id: string, status: CustomDesignOrderStatus) {
    const sb = getSmartStoreSb();
    const { error, data: order } = await sb.from("custom_design_orders")
        .update({ status })
        .eq("id", id)
        .select("user_id, order_number")
        .single();
    if (error || !order) return { error: error?.message || "فشل تحديث الحالة" };

    // If awaiting_review and there's a user, notify them
    if (status === "awaiting_review" && order.user_id) {
        await createUserNotification({
            userId: order.user_id,
            title: "تصميم مخصص 🎨",
            message: `تصميمك (الطلب #${order.order_number}) جاهز الآن للمراجعة والتأكيد! يمكنك الاعتماد والتحويل للسلة أو طلب الإلغاء.`,
            type: "order_update",
            link: `/account/orders?design=${id}`,
        });
    }

    return { success: true };
}

// ─── Admin: Upload Results ──────────────────────────────

export async function uploadDesignResult(id: string, field: "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url", url: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ [field]: url }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Skip Results ────────────────────────────────

export async function skipDesignResults(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ skip_results: true, status: "completed" }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Update Notes ────────────────────────────────

export async function updateDesignOrderNotes(id: string, notes: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ admin_notes: notes }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Send to Customer Cart ───────────────────────

export async function sendDesignOrderToCustomer(id: string, finalPrice: number) {
    const sb = getSmartStoreSb();

    // Update the database to lock in the final price and mark it as sent
    const { error, data: order } = await sb.from("custom_design_orders")
        .update({
            final_price: finalPrice,
            is_sent_to_customer: true,
            status: "awaiting_review",
        })
        .eq("id", id)
        .select("user_id, order_number")
        .single();

    if (error || !order) return { error: error?.message || "فشل التحديث" };

    // Notify the user that their order is priced and ready for checkout
    if (order.user_id) {
        await createUserNotification({
            userId: order.user_id,
            title: "تصميم مخصص جاهز للدفع 🛍️",
            message: `تم تسعير طلبك #${order.order_number} ليصبح جاهزاً للإضافة للسلة والدفع. يرجى مراجعته واعتماده.`,
            type: "order_update",
            link: `/account/orders?design=${id}`,
        });
    }

    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Public Order Actions — تتبع الطلب
// ═══════════════════════════════════════════════════════════

export async function getDesignOrderPublic(id: string): Promise<CustomDesignOrder | null> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_orders").select("*").eq("id", id).single();
    return (data as CustomDesignOrder) ?? null;
}

export async function getUserDesignOrders(): Promise<CustomDesignOrder[]> {
    const user = await currentUser();
    if (!user) return [];

    const sb = getSmartStoreSb();
    const { data: profile } = await sb.from("profiles").select("id").eq("clerk_id", user.id).single();
    if (!profile) return [];

    const { data } = await sb.from("custom_design_orders")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

    return (data as CustomDesignOrder[]) ?? [];
}

export async function approveDesignOrder(id: string) {
    const sb = getSmartStoreSb();
    const { error, data: order } = await sb
        .from("custom_design_orders")
        .update({ status: "completed" })
        .eq("id", id)
        .in("status", ["awaiting_review"])
        .select("user_id, order_number")
        .single();
    if (error) return { error: error.message };

    if (order) {
        await createAdminNotification({
            title: "تأكيد تصميم مخصص ✅",
            message: `قام العميل للتو بمراجعة وتأكيد التصميم للطلب #${order.order_number}.`,
            type: "system_alert",
            link: "/dashboard/smart-store",
        });
    }

    return { success: true };
}

export async function rejectDesignOrder(id: string, reason: string) {
    const sb = getSmartStoreSb();
    const text = (reason || "").trim();
    if (!text) return { error: "يجب ذكر سبب الرفض" };

    const { error } = await sb
        .from("custom_design_orders")
        .update({ status: "cancelled", admin_notes: `رفض — السبب: ${text}` })
        .eq("id", id)
        .eq("status", "new");
    if (error) return { error: error.message };
    return { success: true };
}

export async function cancelDesignOrderByCustomer(id: string) {
    const sb = getSmartStoreSb();
    const { error, data: order } = await sb
        .from("custom_design_orders")
        .update({ status: "cancelled" })
        .eq("id", id)
        .in("status", ["new", "in_progress", "awaiting_review"])
        .select("user_id, order_number")
        .single();
    if (error) return { error: error.message };

    if (order) {
        await createAdminNotification({
            title: "إلغاء تصميم مخصص ❌",
            message: `قام العميل بإلغاء طلب التصميم المخصص #${order.order_number}.`,
            type: "order_alert",
            link: "/dashboard/smart-store",
        });
    }

    return { success: true };
}

// ─── طلب تعديل التصميم (من العميل) ───────────────────────

export async function submitModificationRequest(orderId: string, requestText: string) {
    const sb = getSmartStoreSb();
    const text = (requestText || "").trim();
    if (!text) return { error: "يرجى كتابة تفاصيل التعديل المطلوب" };

    const { error } = await sb
        .from("custom_design_orders")
        .update({
            status: "modification_requested",
            modification_request: text,
        })
        .eq("id", orderId)
        .in("status", ["awaiting_review"]);
    if (error) return { error: error.message };

    const { data: order } = await sb.from("custom_design_orders").select("order_number").eq("id", orderId).single();
    if (order) {
        await createAdminNotification({
            title: "طلب تعديل التصميم ✏️",
            message: `العميل طلب تعديلاً على الطلب #${order.order_number}. راجع طلب التعديل.`,
            type: "order_alert",
            link: "/dashboard/design-orders",
        });
    }

    return { success: true };
}

// ─── Get Garment Pricing ─────────────────────────────────

export async function getGarmentPricing(garmentName: string) {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_garments")
        .select("base_price, price_chest_large, price_chest_small, price_back_large, price_back_small, price_shoulder_large, price_shoulder_small")
        .eq("name", garmentName)
        .single();
    if (!data) return {
        base_price: 0,
        price_chest_large: 0, price_chest_small: 0,
        price_back_large: 0, price_back_small: 0,
        price_shoulder_large: 0, price_shoulder_small: 0,
    };
    return data as {
        base_price: number;
        price_chest_large: number; price_chest_small: number;
        price_back_large: number; price_back_small: number;
        price_shoulder_large: number; price_shoulder_small: number;
    };
}

// ─── Confirm: Save Placement + Price ─────────────────────

export async function confirmDesignOrder(id: string, position?: string | null, size?: string | null, price?: number | null) {
    const sb = getSmartStoreSb();
    const updateData: Partial<CustomDesignOrder> = { status: "completed" };
    if (position) updateData.print_position = position;
    if (size) updateData.print_size = size;
    if (price !== undefined && price !== null) updateData.final_price = price;

    const { error } = await sb
        .from("custom_design_orders")
        .update(updateData)
        .eq("id", id);
    if (error) return { error: error.message };

    const { data: order } = await sb.from("custom_design_orders").select("order_number").eq("id", id).single();
    if (order) {
        await createAdminNotification({
            title: "تأكيد تصميم مخصّص للسلة 🛒",
            message: `قام العميل للتو بمراجعة وتأكيد التصميم للطلب #${order.order_number} وأضافه للسلة.`,
            type: "system_alert",
            link: "/dashboard/smart-store",
        });
    }

    return { success: true };
}

// ─── Submit Additional Design (على نفس الطلب) ─────────────

export async function submitAdditionalDesignOrder(
    parentOrderId: string,
    data: {
        print_position: string;
        print_size: string;
        style_name: string;
        style_image_url?: string | null;
        art_style_name: string;
        art_style_image_url?: string | null;
        color_package_name?: string | null;
        custom_colors?: string[];
    }
) {
    const sb = getSmartStoreSb();

    const { data: parent, error: fetchErr } = await sb
        .from("custom_design_orders")
        .select("*")
        .eq("id", parentOrderId)
        .single();

    if (fetchErr || !parent) return { error: "الطلب الأساسي غير موجود" };
    const p = parent as CustomDesignOrder;

    if (p.status !== "completed") return { error: "يجب تأكيد التصميم الأساسي أولاً" };
    if (p.print_position === data.print_position) return { error: "اختر موقعاً مختلفاً عن التصميم الأساسي" };

    const template = await getDesignPromptTemplate();
    const colorsStr = data.color_package_name
        ? data.color_package_name
        : data.custom_colors && data.custom_colors.length > 0
            ? data.custom_colors.join(", ")
            : `${p.color_name} (${p.color_hex})`;

    const userPrompt = p.design_method === "from_text"
        ? (p.text_prompt ?? "—")
        : p.design_method === "from_image"
            ? `[صورة مرجعية: ${p.reference_image_url ?? "—"}]`
            : `[تصميم إضافي: ${p.text_prompt ?? "—"}]`;

    const aiPrompt = generateAiPrompt(template, {
        garment_name: p.garment_name,
        color_name: p.color_name,
        color_hex: p.color_hex,
        style_name: data.style_name || "—",
        art_style_name: data.art_style_name || "—",
        colors: colorsStr,
        user_prompt: userPrompt,
    });

    const payload = {
        user_id: p.user_id,
        parent_order_id: parentOrderId,
        garment_name: p.garment_name,
        garment_image_url: p.garment_image_url,
        color_name: p.color_name,
        color_hex: p.color_hex,
        color_image_url: p.color_image_url,
        size_name: p.size_name,
        design_method: p.design_method,
        text_prompt: p.text_prompt,
        reference_image_url: p.reference_image_url,
        style_name: data.style_name || "—",
        style_image_url: data.style_image_url || null,
        art_style_name: data.art_style_name || "—",
        art_style_image_url: data.art_style_image_url || null,
        color_package_name: data.color_package_name || null,
        custom_colors: data.custom_colors ?? [],
        ai_prompt: aiPrompt,
        customer_name: p.customer_name,
        customer_email: p.customer_email,
        customer_phone: p.customer_phone,
        print_position: data.print_position,
        print_size: data.print_size,
    };

    const { data: inserted, error } = await sb
        .from("custom_design_orders")
        .insert(payload)
        .select("id, order_number")
        .single();

    if (error || !inserted) return { error: error?.message || "فشل إنشاء الطلب الإضافي" };

    await createAdminNotification({
        type: "order_alert",
        title: "تصميم إضافي على الطلب 🎨",
        message: `طلب تصميم إضافي #${inserted.order_number} — ${p.garment_name} (موقع: ${data.print_position}) مرتبط بالطلب #${p.order_number}`,
        link: "/dashboard/design-orders",
    });

    return { success: true, orderId: inserted.id, orderNumber: inserted.order_number };
}

// ─── Assign Design Order to Admin ────────────────────────

export async function assignDesignOrder(orderId: string, adminProfileId: string | null) {
    const sb = getSmartStoreSb();
    const { error } = await sb
        .from("custom_design_orders")
        .update({ assigned_to: adminProfileId })
        .eq("id", orderId);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Design Order Stats ──────────────────────────────────

export async function getDesignOrderStats() {
    const sb = getSmartStoreSb();

    const [newRes, inProgRes, awaitRes, modRes, compRes, cancelRes, revenueRes] = await Promise.all([
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "modification_requested"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        sb.from("custom_design_orders").select("final_price").eq("status", "completed").not("final_price", "is", null),
    ]);

    const revenue = (revenueRes.data || []).reduce((sum: number, r) => sum + (r.final_price || 0), 0);

    return {
        new: newRes.count ?? 0,
        in_progress: inProgRes.count ?? 0,
        awaiting_review: awaitRes.count ?? 0,
        modification_requested: modRes.count ?? 0,
        completed: compRes.count ?? 0,
        cancelled: cancelRes.count ?? 0,
        revenue,
    };
}

// ─── Get Admin List ──────────────────────────────────────

export async function getAdminList() {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("role", "admin")
        .order("display_name");
    return (data as { id: string; display_name: string; avatar_url: string | null }[]) ?? [];
}
