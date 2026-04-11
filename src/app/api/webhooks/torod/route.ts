import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { torod } from "@/lib/shipping/torod";

/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — Torod Webhook Handler
 *  Receives status updates from Torod and syncs with Supabase
 * ═══════════════════════════════════════════════════════════
 */

// Torod checking for 200 OK on GET/POST during validation
export async function GET() {
    return NextResponse.json({ status: "ok", message: "Wusha Torod Endpoint Active" });
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        
        // Handle empty bodies (Ping/Validation)
        if (!rawBody) {
            return NextResponse.json({ success: true, message: "Ping received" });
        }

        const payload = JSON.parse(rawBody);
        const headerHmac = req.headers.get("X-Hmac-Sha256");

        console.log("[Torod Webhook Received]:", JSON.stringify(payload, null, 2));

        // 1. Security Check
        if (headerHmac && !torod.validateWebhookSignature(rawBody, headerHmac)) {
            console.error("[Torod Webhook Security] Invalid HMAC signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const { order_id, tracking_id, status } = payload;

        // Validation/Ping check (if specific identifiers missing but body exists)
        if (!order_id && !tracking_id) {
            return NextResponse.json({ success: true, message: "Validation payload received" });
        }

        const supabase = getSupabaseAdminClient();

        // 2. Map Torod status to Wusha Status
        let wushaStatus: string | null = null;
        const normalizedStatus = status?.toLowerCase() || "unknown";
        
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
        const { data: order, error: fetchError } = await (supabase as any)
            .from("orders")
            .select("id, status, metadata")
            .or(`id.eq.${order_id},tracking_number.eq.${tracking_id}`)
            .single();

        if (fetchError || !order) {
            console.warn("[Torod Webhook] Order not found for:", { order_id, tracking_id });
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
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
