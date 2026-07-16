import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyApprovedOrderAssetGraph } from "@/lib/washa-artwork/order-integrity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(value: string | number | null | undefined) {
    return String(value || "dtf")
        .trim()
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "dtf";
}

function getHttpUrl(value: string | null | undefined) {
    if (!value) return null;

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) {
        return { ok: false as const, status: 401, error: "Unauthorized" };
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_id", userId)
        .single();

    if (error || profile?.role !== "admin") {
        return { ok: false as const, status: 403, error: "Forbidden" };
    }

    return { ok: true as const, supabase };
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const params = await context.params;
    const access = await requireAdmin();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: order, error } = await access.supabase
        .from("custom_design_orders")
        .select("order_number, dtf_extracted_url, design_request_id, design_master_asset_id, design_revision_id, master_checksum, print_asset_path, asset_schema_version, production_readiness_status")
        .eq("id", params.id)
        .single();

    if (error || !order) {
        return NextResponse.json({ error: "DTF file not found" }, { status: 404 });
    }

    let contentType = "image/png";
    let buffer: ArrayBuffer;
    if ((order.asset_schema_version ?? 0) >= 1 && order.print_asset_path) {
        const integrity = await verifyApprovedOrderAssetGraph(access.supabase, order);
        if (!integrity.ok || !integrity.printBuffer) {
            return NextResponse.json(
                { error: integrity.ok ? "Approved production asset is unavailable" : integrity.error },
                { status: 409 }
            );
        }
        buffer = integrity.printBuffer.buffer.slice(
            integrity.printBuffer.byteOffset,
            integrity.printBuffer.byteOffset + integrity.printBuffer.byteLength
        ) as ArrayBuffer;
    } else {
        const sourceUrl = getHttpUrl(order.dtf_extracted_url);
        if (!sourceUrl) {
            return NextResponse.json({ error: "Invalid DTF file URL" }, { status: 422 });
        }

        const upstream = await fetch(sourceUrl, { cache: "no-store" });
        if (!upstream.ok) {
            return NextResponse.json({ error: "Unable to fetch DTF file" }, { status: 502 });
        }
        contentType = upstream.headers.get("content-type") || "image/png";
        buffer = await upstream.arrayBuffer();
    }
    const dispositionType = request.nextUrl.searchParams.get("mode") === "inline" ? "inline" : "attachment";
    const filename = `washa-dtf-${safeFilename(order.order_number)}.png`;

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": contentType,
            "Content-Disposition": `${dispositionType}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            "Cache-Control": "private, no-store, max-age=0",
        },
    });
}
