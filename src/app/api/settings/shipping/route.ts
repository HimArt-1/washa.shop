// GET /api/settings/shipping — إعدادات الشحن للصفحات العامة
import { NextResponse } from "next/server";
import { getSiteSettings } from "@/app/actions/settings";

export async function GET() {
    const settings = await getSiteSettings();
    return NextResponse.json({
        flat_rate: settings.shipping.flat_rate ?? 30,
        free_above: settings.shipping.free_above ?? 500,
        tax_rate: settings.shipping.tax_rate ?? 15,
        shipping_enabled: settings.shipping.shipping_enabled ?? true,
        tax_enabled: settings.shipping.tax_enabled ?? true,
    });
}
