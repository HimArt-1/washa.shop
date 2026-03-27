import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminNotification } from "@/app/actions/notifications";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignSize,
    CustomDesignStyle,
    Database,
    DesignPricingSnapshot,
} from "@/types/database";

export const runtime = "nodejs";

const BUCKET = "smart-store";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const CUSTOM_PALETTE_ID = "__custom_palette__";

type SubmitOrderBody = {
    garmentId?: string | null;
    garmentType?: string;
    colorId?: string | null;
    garmentColor?: string;
    colorHex?: string;
    sizeId?: string | null;
    garmentSize?: string;
    designMethod?: string;
    prompt?: string;
    calligraphyText?: string;
    styleId?: string | null;
    style?: string;
    techniqueId?: string | null;
    technique?: string;
    paletteId?: string | null;
    palette?: string;
    customPalette?: string | null;
    mockupDataUrl?: string;
    extractedDataUrl?: string | null;
};

type OrderInsert = Database["public"]["Tables"]["custom_design_orders"]["Insert"];

function asTrimmedString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function buildPricingSnapshot(garment: CustomDesignGarment | null): DesignPricingSnapshot | null {
    if (!garment) return null;

    return {
        garment_id: garment.id,
        garment_name: garment.name,
        captured_at: new Date().toISOString(),
        base_price: garment.base_price,
        price_chest_large: garment.price_chest_large,
        price_chest_small: garment.price_chest_small,
        price_back_large: garment.price_back_large,
        price_back_small: garment.price_back_small,
        price_shoulder_large: garment.price_shoulder_large,
        price_shoulder_small: garment.price_shoulder_small,
    };
}

function buildCustomColorsPayload(customPalette: string) {
    if (!customPalette) return [];
    return [
        {
            name: "custom-palette",
            prompt: customPalette,
        },
    ];
}

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

    const { data, error } = await sb.storage.from(BUCKET).upload(path, buffer, {
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
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return NextResponse.json({ error: "غير مصرح لك باستخدام استوديو DTF" }, { status: 403 });
    }

    let body: SubmitOrderBody;

    try {
        body = (await request.json()) as SubmitOrderBody;
    } catch {
        return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const garmentId = asTrimmedString(body.garmentId);
    const garmentType = asTrimmedString(body.garmentType);
    const colorId = asTrimmedString(body.colorId);
    const garmentColor = asTrimmedString(body.garmentColor);
    const colorHex = asTrimmedString(body.colorHex);
    const sizeId = asTrimmedString(body.sizeId);
    const garmentSize = asTrimmedString(body.garmentSize);
    const styleId = asTrimmedString(body.styleId);
    const style = asTrimmedString(body.style);
    const techniqueId = asTrimmedString(body.techniqueId);
    const technique = asTrimmedString(body.technique);
    const paletteId = asTrimmedString(body.paletteId);
    const palette = asTrimmedString(body.palette);
    const customPalette = asTrimmedString(body.customPalette);
    const prompt = asTrimmedString(body.prompt);
    const calligraphyText = asTrimmedString(body.calligraphyText);
    const mockupDataUrl = asTrimmedString(body.mockupDataUrl);
    const extractedDataUrl = asTrimmedString(body.extractedDataUrl);

    if (!garmentType || !garmentColor || !mockupDataUrl || !style || !technique) {
        return NextResponse.json({ error: "بيانات الطلب ناقصة" }, { status: 400 });
    }

    const sb = getSupabaseAdminClient();

    const [
        garmentRes,
        colorRes,
        sizeRes,
        styleRes,
        techniqueRes,
        paletteRes,
    ] = await Promise.all([
        garmentId
            ? sb.from("custom_design_garments").select("*").eq("id", garmentId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        colorId
            ? sb.from("custom_design_colors").select("*").eq("id", colorId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        sizeId
            ? sb.from("custom_design_sizes").select("*").eq("id", sizeId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        styleId
            ? sb.from("custom_design_styles").select("*").eq("id", styleId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        techniqueId
            ? sb.from("custom_design_art_styles").select("*").eq("id", techniqueId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        paletteId && paletteId !== CUSTOM_PALETTE_ID
            ? sb.from("custom_design_color_packages").select("*").eq("id", paletteId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    const optionFetchError =
        garmentRes.error ||
        colorRes.error ||
        sizeRes.error ||
        styleRes.error ||
        techniqueRes.error ||
        paletteRes.error;

    if (optionFetchError) {
        console.error("[dtf-submit-order:options]", optionFetchError);
        return NextResponse.json({ error: "تعذر التحقق من إعدادات المتجر الذكي" }, { status: 500 });
    }

    const garmentRow = (garmentRes.data as CustomDesignGarment | null) ?? null;
    const colorRow = (colorRes.data as CustomDesignColor | null) ?? null;
    const sizeRow = (sizeRes.data as CustomDesignSize | null) ?? null;
    const styleRow = (styleRes.data as CustomDesignStyle | null) ?? null;
    const artStyleRow = (techniqueRes.data as CustomDesignArtStyle | null) ?? null;
    const colorPackageRow = (paletteRes.data as CustomDesignColorPackage | null) ?? null;

    if (colorRow && garmentRow && colorRow.garment_id !== garmentRow.id) {
        return NextResponse.json({ error: "اللون المحدد لا يتبع القطعة المختارة" }, { status: 400 });
    }

    if (sizeRow && garmentRow && sizeRow.garment_id !== garmentRow.id) {
        return NextResponse.json({ error: "المقاس المحدد لا يتبع القطعة المختارة" }, { status: 400 });
    }

    if (sizeRow && colorRow && sizeRow.color_id && sizeRow.color_id !== colorRow.id) {
        return NextResponse.json({ error: "المقاس المحدد لا يتبع اللون المختار" }, { status: 400 });
    }

    const resolvedGarmentName = garmentRow?.name || garmentType;
    const resolvedColorName = colorRow?.name || garmentColor;
    const resolvedColorHex = colorRow?.hex_code || colorHex || "#111111";
    const resolvedSizeName = sizeRow?.name || garmentSize;
    const resolvedStyleName = styleRow?.name || style;
    const resolvedTechniqueName = artStyleRow?.name || technique;
    const resolvedPaletteName = colorPackageRow?.name || palette;
    const resolvedPaletteLabel = customPalette || resolvedPaletteName;

    if (!resolvedGarmentName || !resolvedColorName || !resolvedSizeName || !resolvedStyleName || !resolvedTechniqueName) {
        return NextResponse.json({ error: "إعدادات الطلب غير مكتملة" }, { status: 400 });
    }

    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const mockupResult = await uploadDataUrl(
        sb,
        mockupDataUrl,
        `design-orders/dtf-${slug}/mockup.png`
    );

    if ("error" in mockupResult) {
        return NextResponse.json({ error: mockupResult.error }, { status: 500 });
    }

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
        // Anonymous submission remains valid.
    }

    const designDesc = calligraphyText
        ? `مخطوطة: "${calligraphyText}"`
        : prompt || "تصميم من استوديو DTF";

    const aiPrompt = [
        "[طلب من استوديو DTF]",
        `القطعة: ${resolvedGarmentName} — اللون: ${resolvedColorName} — المقاس: ${resolvedSizeName}`,
        `أسلوب التصميم: ${resolvedStyleName}`,
        `التقنية: ${resolvedTechniqueName}`,
        `لوحة الألوان: ${resolvedPaletteLabel || "غير محددة"}`,
        `الوصف: ${designDesc}`,
        `رابط الموكب: ${mockupResult.url}`,
        extractedUrl ? `رابط ملف DTF: ${extractedUrl}` : null,
    ].filter(Boolean).join("\n");

    const orderPayload: OrderInsert = {
        user_id: userId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: null,
        garment_id: garmentRow?.id ?? null,
        garment_name: resolvedGarmentName,
        garment_image_url: garmentRow?.image_url ?? null,
        color_id: colorRow?.id ?? null,
        color_name: resolvedColorName,
        color_hex: resolvedColorHex,
        color_image_url: colorRow?.image_url ?? null,
        size_id: sizeRow?.id ?? null,
        size_name: resolvedSizeName,
        design_method: "studio",
        text_prompt: designDesc,
        reference_image_url: null,
        preset_id: null,
        preset_name: null,
        preset_fully_aligned: false,
        style_id: styleRow?.id ?? null,
        style_name: resolvedStyleName,
        style_image_url: styleRow?.image_url ?? null,
        art_style_id: artStyleRow?.id ?? null,
        art_style_name: resolvedTechniqueName,
        art_style_image_url: artStyleRow?.image_url ?? null,
        color_package_id: colorPackageRow?.id ?? null,
        color_package_name: resolvedPaletteName || null,
        custom_colors: buildCustomColorsPayload(customPalette),
        studio_item_id: null,
        ai_prompt: aiPrompt,
        print_position: "chest",
        print_size: "large",
        pricing_snapshot: buildPricingSnapshot(garmentRow),
        dtf_mockup_url: mockupResult.url,
        dtf_extracted_url: extractedUrl,
        dtf_style_label: resolvedStyleName,
        dtf_technique_label: resolvedTechniqueName,
        dtf_palette_label: resolvedPaletteLabel || null,
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

    await createAdminNotification({
        type: "order_alert",
        category: "design",
        severity: "info",
        title: `طلب DTF Studio جديد 🎨 #${orderRow.order_number}`,
        message: `${resolvedGarmentName} · ${resolvedColorName} · ${resolvedStyleName}`,
        link: `/dashboard/design-orders/${orderRow.id}`,
    }).catch((error) => console.warn("[dtf-submit-order:notify]", error));

    return NextResponse.json({
        orderId: orderRow.id,
        orderNumber: orderRow.order_number,
        mockupUrl: mockupResult.url,
    });
}
