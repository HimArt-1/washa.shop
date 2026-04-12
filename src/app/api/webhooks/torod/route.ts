import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { torod } from "@/lib/shipping/torod";

/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — Torod Webhook Handler
 *  Receives status updates from Torod and syncs with Supabase
 * ═══════════════════════════════════════════════════════════
 */

// Torod (and similar platforms) may probe the URL with GET, HEAD, POST (empty), or non-JSON POST.
// All must return 2xx for “webhook valid” checks in the dashboard.

export async function GET() {
    return NextResponse.json({ status: "ok", message: "Wusha Torod Endpoint Active" });
}

/** Some providers validate with HEAD only — return 200 with no body. */
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            Allow: "GET, HEAD, POST, OPTIONS",
        },
    });
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();

        // Ping / empty body (common for “test webhook URL”)
        if (!rawBody.trim()) {
            return NextResponse.json({ success: true, message: "Ping received" });
        }

        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
            console.warn("[Torod Webhook] Non-JSON body (treating as URL validation)");
            return NextResponse.json({ success: true, message: "Acknowledged" });
        }

        const headerHmac = req.headers.get("X-Hmac-Sha256");

        console.log("[Torod Webhook Received]:", JSON.stringify(payload, null, 2));

        // 1. Security Check
        if (headerHmac && !torod.validateWebhookSignature(rawBody, headerHmac)) {
            console.error("[Torod Webhook Security] Invalid HMAC signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const order_id =
            typeof payload.order_id === "string" ? payload.order_id : undefined;
        const tracking_id =
            typeof payload.tracking_id === "string" ? payload.tracking_id : undefined;
        const status =
            typeof payload.status === "string" ? payload.status : undefined;

        // Validation/Ping check (if specific identifiers missing but body exists)
        if (!order_id && !tracking_id) {
            return NextResponse.json({ success: true, message: "Validation payload received" });
        }

        const supabase = getSupabaseAdminClient();

        // 2. Map Torod status to Wusha Status
        let wushaStatus: string | null = null;
        const normalizedStatus = status ? status.toLowerCase() : "unknown";
        
        switch (normalizedStatus) {
            case "shipped":
            case "in transit":
            case "ready for pickup":
            case "picked up":
                wushaStatus = "shipped";
                break;
            case "delivered":
                wushaStatus = "delivered";
                break;
            case "cancelled":
                wushaStatus = "cancelled";
                break;
            case "failed":
            case "rto":
            case "damage":
            case "lost":
                wushaStatus = "shipping_failed";
                break;
            default:
                wushaStatus = null; // No change if status unknown or intermediate
        }

        // 3. Find the order (metadata column exists in DB but may be missing from generated types)
        let orderQuery = (supabase as any)
            .from("orders")
            .select("id, status, metadata");

        if (order_id && tracking_id) {
            orderQuery = orderQuery.or(
                `id.eq.${order_id},tracking_number.eq.${tracking_id}`
            );
        } else if (order_id) {
            orderQuery = orderQuery.eq("id", order_id);
        } else {
            orderQuery = orderQuery.eq("tracking_number", tracking_id as string);
        }

        const { data: order, error: fetchError } = await orderQuery.single();

        if (fetchError || !order) {
            // Torod’s “validate webhook URL” often POSTs sample payloads; those IDs won’t exist → must still be 2xx.
            console.warn("[Torod Webhook] Order not found (ack 200):", {
                order_id,
                tracking_id,
                fetchError: fetchError?.message,
            });
            return NextResponse.json({
                success: true,
                acknowledged: true,
                message: "No matching order; event ignored",
            });
        }

        // 4. Update metadata with history
        const currentMetadata = (order.metadata as any) || {};
        const history = currentMetadata.shipping_history || [];
        
        const newHistoryEntry = {
            status: normalizedStatus,
            timestamp: new Date().toISOString(),
            raw_payload: payload
        };

        const updateData: any = {
            torod_last_status: status,
            metadata: {
                ...currentMetadata,
                shipping_history: [...history, newHistoryEntry]
            },
            updated_at: new Date().toISOString()
        };

        if (wushaStatus && wushaStatus !== order.status) {
            updateData.status = wushaStatus;
        }

        const { error: updateError } = await (supabase as any)
            .from("orders")
            .update(updateData)
            .eq("id", order.id);

        if (updateError) {
            throw updateError;
        }

        console.log(`[Torod Webhook Success] Updated Order #${order.id} status to: ${normalizedStatus}`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Torod Webhook Error]:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
