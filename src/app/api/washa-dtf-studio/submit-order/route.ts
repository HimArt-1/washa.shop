import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createAdminNotification } from "@/app/actions/notifications";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// ── Color hex approximations for DTF garment colors ──────────
const COLOR_HEX_MAP: Record<string, string> = {
    "أسود": "#0D0D0D",
    "أبيض": "#FAFAFA",
    "رمادي": "#808080",
    "كحلي": "#1A2744",
    "بيج": "#D9C5A0",
    "زيتي": "#4A5340",
    "أحمر عنابي": "#6B1B1B",
    "أخضر غابة": "#1C4A2A",
    "أزرق ملكي": "#1B3A8C",
    "خردلي": "#B08A20",
    "بنفسجي داكن": "#3C1F5A",
    "وردي مغبر": "#C4899A",
    "بني قهوة": "#5A3320",
    "برتقالي محروق": "#A84515",
    "فحم داكن": "#2A2A2A",
    "أزرق سماوي": "#5EB5E8",
};

const BUCKET = "smart-store";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

// ── Upload a base64 data URL to Supabase Storage ─────────────
async function uploadDataUrl(
    sb: ReturnType<typeof getSupabaseAdminClient>,
    dataUrl: string,
    path: string
): Promise<{ url: string } | { error: string }> {
    const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!match) return { error: "صيغة الصورة غير صحيحة" };

    const mimeType = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return { error: "حجم الصورة كبير جدًا (أكثر من 6 ميجابايت)" };
    }

    const { data, error } = await sb.storage
        .from(BUCKET)
        .upload(path, buffer, {
            contentType: mimeType,
            cacheControl: "31536000",
            upsert: false,
        });

    if (error || !data?.path) {
        console.error("[dtf-submit-order:upload]", error);
        return { error: error?.message || "فشل رفع الصورة" };
    }

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(data.path);
    return { url: urlData.publicUrl };
}

export async function POST(request: NextRequest) {
    // ── Auth check ────────────────────────────────────────────
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return NextResponse.json({ error: "غير مصرح لك باستخدام استوديو DTF" }, { status: 403 });
    }

    let body: {
        garmentType: string;
        garmentColor: string;
        designMethod: string;
        prompt?: string;
        calligraphyText?: string;
        style: string;
        technique: string;
        palette: string;
        mockupDataUrl: string;
        extractedDataUrl?: string | null;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const { garmentType, garmentColor, mockupDataUrl, extractedDataUrl, designMethod, style, technique, palette } = body;

    if (!garmentType || !garmentColor || !mockupDataUrl) {
        return NextResponse.json({ error: "بيانات الطلب ناقصة" }, { status: 400 });
    }

    const sb = getSupabaseAdminClient();
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ── Upload mockup ─────────────────────────────────────────
    const mockupResult = await uploadDataUrl(
        sb,
        mockupDataUrl,
        `design-orders/dtf-${slug}/mockup.png`
    );
    if ("error" in mockupResult) {
        return NextResponse.json({ error: mockupResult.error }, { status: 500 });
    }

    // ── Upload extracted DTF design (optional) ────────────────
    let extractedUrl: string | null = null;
    if (extractedDataUrl) {
        const extractedResult = await uploadDataUrl(
            sb,
            extractedDataUrl,
            `design-orders/dtf-${slug}/extracted.png`
        );
        if (!("error" in extractedResult)) {
            extractedUrl = extractedResult.url;
        }
    }

    // ── Get user profile if logged in ─────────────────────────
    let userId: string | null = null;
    let customerName: string | null = null;
    let customerEmail: string | null = null;

    try {
        const user = await currentUser();
        if (user) {
            const { data: profile } = await sb
                .from("profiles")
                .select("id")
                .eq("clerk_id", user.id)
                .single();
            if (profile) userId = profile.id;
            customerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
            customerEmail = user.emailAddresses?.[0]?.emailAddress ?? null;
        }
    } catch {
        // Non-fatal — anonymous order is fine
    }

    // ── Build descriptive text for the prompt ─────────────────
    const designDesc = body.calligraphyText
        ? `مخطوطة: "${body.calligraphyText}"`
        : body.prompt
            ? body.prompt
            : "تصميم من DTF Studio";

    const aiPrompt = [
        `[طلب من استوديو DTF المطور]`,
        `القطعة: ${garmentType} — اللون: ${garmentColor}`,
        `أسلوب التصميم: ${style}`,
        `التقنية: ${technique}`,
        `لوحة الألوان: ${palette}`,
        `الوصف: ${designDesc}`,
        `رابط الموكب: ${mockupResult.url}`,
        extractedUrl ? `رابط ملف DTF: ${extractedUrl}` : null,
    ].filter(Boolean).join("\n");

    // ── Insert order ──────────────────────────────────────────
    const colorHex = COLOR_HEX_MAP[garmentColor] ?? "#000000";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderPayload: any = {
        user_id: userId,
            garment_name: garmentType,
            color_name: garmentColor,
            color_hex: colorHex,
            size_name: "L",
            design_method: "studio",
            text_prompt: designDesc,
            style_name: style,
            art_style_name: technique,
            color_package_name: palette,
            ai_prompt: aiPrompt,
            print_position: "chest",
            print_size: "large",
            customer_name: customerName,
            customer_email: customerEmail,
            // DTF Studio specific fields
            dtf_mockup_url: mockupResult.url,
            dtf_extracted_url: extractedUrl,
            dtf_style_label: style,
            dtf_technique_label: technique,
            dtf_palette_label: palette,
    };

    const { data: orderRow, error: insertError } = await sb
        .from("custom_design_orders")
        .insert(orderPayload)
        .select("id, order_number")
        .single();

    if (insertError || !orderRow) {
        console.error("[dtf-submit-order:insert]", insertError);
        return NextResponse.json({ error: insertError?.message || "فشل إنشاء الطلب" }, { status: 500 });
    }

    // ── Notify admins ─────────────────────────────────────────
    await createAdminNotification({
        type: "order_alert",
        category: "design",
        severity: "info",
        title: `طلب DTF Studio جديد 🎨 #${orderRow.order_number}`,
        message: `${garmentType} · ${garmentColor} · ${style}`,
        link: `/dashboard/design-orders/${orderRow.id}`,
    }).catch((e) => console.warn("[dtf-submit-order:notify]", e));

    return NextResponse.json({
        orderId: orderRow.id,
        orderNumber: orderRow.order_number,
        mockupUrl: mockupResult.url,
    });
}
